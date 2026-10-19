import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../context/AuthContext';
import { api, PaymentItem, SummaryData } from '../services/api';
import { colors } from '../theme/colors';
import { PaymentModal } from '../components/PaymentModal';
import { CustomAlertModal, AlertModalConfig } from '../components/CustomAlertModal';
import { LoadingModal } from '../components/LoadingModal';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { storage } from '../services/storage';
import { formatDateToDDMMYYYY } from '../utils/date';

export const PaymentBookScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [summary, setSummary] = useState<SummaryData>({ totalAmount: 0, totalCount: 0 });
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [actionLoadingMessage, setActionLoadingMessage] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<PaymentItem | null>(null);
  const [alertConfig, setAlertConfig] = useState<AlertModalConfig>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const fetchData = useCallback(async (searchQuery = search) => {
    try {
      if (searchQuery) {
        setIsSearching(true);
      }
      const [paymentsRes, summaryRes] = await Promise.all([
        api.getPayments(searchQuery),
        api.getSummary(),
      ]);

      if (paymentsRes.success) {
        const descSorted = [...paymentsRes.payments].sort((a, b) => {
          const timeA = new Date(a.createdAt || 0).getTime();
          const timeB = new Date(b.createdAt || 0).getTime();
          return timeB - timeA;
        });
        setPayments(descSorted);
      }
      if (summaryRes.success) {
        setSummary({
          totalAmount: summaryRes.totalAmount,
          totalCount: summaryRes.totalCount,
        });
      }
    } catch (err: any) {
      console.warn('Fetch error:', err.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsSearching(false);
    }
  }, [search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const handleSearchChange = (text: string) => {
    setSearch(text);
    fetchData(text);
  };

  const handleSavePayment = async (data: {
    recipientName: string;
    amount: number;
    paymentDate: string;
    paymentMethod: 'Cash' | 'UPI' | 'Bank';
    note?: string;
  }) => {
    try {
      setActionLoadingMessage(editingItem ? 'Updating payment...' : 'Saving payment...');
      if (editingItem) {
        await api.updatePayment(editingItem._id, data);
      } else {
        await api.createPayment(data);
      }
      await fetchData();
    } finally {
      setActionLoadingMessage(null);
    }
  };

  const handleDeletePayment = (item: PaymentItem) => {
    setAlertConfig({
      visible: true,
      title: 'Delete Payment',
      message: `Are you sure you want to delete payment of ₹${item.amount.toLocaleString('en-IN')} for "${item.recipientName}"?`,
      type: 'danger',
      isDestructive: true,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onCancel: () => setAlertConfig(prev => ({ ...prev, visible: false })),
      onConfirm: async () => {
        setAlertConfig(prev => ({ ...prev, visible: false }));
        try {
          setActionLoadingMessage('Deleting payment entry...');
          await api.deletePayment(item._id);
          await fetchData();
        } catch (err: any) {
          setAlertConfig({
            visible: true,
            title: 'Error',
            message: err.message || 'Failed to delete payment.',
            type: 'danger',
            confirmText: 'OK',
            onConfirm: () => setAlertConfig(prev => ({ ...prev, visible: false })),
          });
        } finally {
          setActionLoadingMessage(null);
        }
      },
    });
  };

  const handleExportPDF = async () => {
    try {
      if (payments.length === 0) {
        setAlertConfig({
          visible: true,
          title: 'Notice',
          message: 'No payment entries to export.',
          type: 'info',
          confirmText: 'OK',
          onConfirm: () => setAlertConfig(prev => ({ ...prev, visible: false })),
        });
        return;
      }
      setIsExporting(true);
      setActionLoadingMessage('Generating & preparing PDF report...');
      const token = await storage.getToken();
      const fileUri = `${FileSystem.documentDirectory}payments_report_${Date.now()}.pdf`;

      const downloadRes = await FileSystem.downloadAsync(
        api.getPDFExportUrl(),
        fileUri,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (downloadRes.status !== 200) {
        throw new Error(`Failed to generate PDF (Status ${downloadRes.status})`);
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadRes.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Payment Report PDF',
          UTI: 'com.adobe.pdf',
        });
      } else {
        setAlertConfig({
          visible: true,
          title: 'PDF Exported',
          message: `PDF saved successfully to: ${downloadRes.uri}`,
          type: 'success',
          confirmText: 'OK',
          onConfirm: () => setAlertConfig(prev => ({ ...prev, visible: false })),
        });
      }
    } catch (err: any) {
      setAlertConfig({
        visible: true,
        title: 'Export Error',
        message: err.message || 'Failed to export PDF report.',
        type: 'danger',
        confirmText: 'OK',
        onConfirm: () => setAlertConfig(prev => ({ ...prev, visible: false })),
      });
    } finally {
      setIsExporting(false);
      setActionLoadingMessage(null);
    }
  };

  const handleLogout = () => {
    setAlertConfig({
      visible: true,
      title: 'Sign Out',
      message: 'Are you sure you want to sign out from your account?',
      type: 'warning',
      isDestructive: true,
      confirmText: 'Sign Out',
      cancelText: 'Cancel',
      onCancel: () => setAlertConfig(prev => ({ ...prev, visible: false })),
      onConfirm: () => {
        setAlertConfig(prev => ({ ...prev, visible: false }));
        logout();
      },
    });
  };

  const renderPaymentCard = ({ item }: { item: PaymentItem }) => {
    const chipBg =
      item.paymentMethod === 'Cash'
        ? colors.chipCash
        : item.paymentMethod === 'UPI'
          ? colors.chipUPI
          : colors.chipBank;

    return (
      <View style={styles.card}>
        {/* Row 1: Name and Amount */}
        <View style={styles.cardHeader}>
          <Text style={styles.recipientName}>{item.recipientName}</Text>
          <Text style={styles.cardAmount}>₹{item.amount.toLocaleString('en-IN')}</Text>
        </View>

        {/* Row 2: Date & Method Chip */}
        <View style={styles.cardMetaRow}>
          <View style={styles.dateRow}>
            <MaterialCommunityIcons name="calendar-outline" size={14} color={colors.muted} />
            <Text style={styles.dateText}>{formatDateToDDMMYYYY(item.paymentDate)}</Text>
          </View>
          <View style={[styles.methodChip, { backgroundColor: chipBg }]}>
            <Text style={styles.methodChipText}>{item.paymentMethod}</Text>
          </View>
        </View>

        {/* Note if available */}
        {!!item.note && (
          <View style={styles.noteBox}>
            <Text style={styles.noteText}>{item.note}</Text>
          </View>
        )}

        {/* Actions: Edit & Delete */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              setEditingItem(item);
              setModalVisible(true);
            }}
          >
            <MaterialCommunityIcons name="pencil-outline" size={16} color={colors.primary} />
            <Text style={styles.actionBtnText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => handleDeletePayment(item)}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={16} color={colors.danger} />
            <Text style={[styles.actionBtnText, styles.deleteBtnText]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      {/* Main Header Card: Total & User */}
      <View style={styles.headerContainer}>
        {/* Left: Logged-in User's Total */}
        <View style={styles.totalBlock}>
          <Text style={styles.totalLabel}>My Total Payments</Text>
          <Text style={styles.totalAmount}>₹{summary.totalAmount.toLocaleString('en-IN')}</Text>
          <Text style={styles.totalCount}>{summary.totalCount} payments</Text>
        </View>

        {/* Right: User Avatar & Logout */}
        <View style={styles.userBlock}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() || 'U'}</Text>
            </View>
            <Text style={styles.userName} numberOfLines={1}>{user?.name || 'User'}</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <MaterialCommunityIcons name="logout" size={14} color={colors.heading} style={{ marginRight: 4 }} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Section Title & PDF Export */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>My Payment Entries</Text>
        <TouchableOpacity
          style={styles.pdfBtn}
          onPress={handleExportPDF}
          disabled={isExporting}
          activeOpacity={0.8}
        >
          {isExporting ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <MaterialCommunityIcons name="file-pdf-box" size={18} color={colors.primary} />
              <Text style={styles.pdfBtnText}>Export PDF</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={20} color={colors.muted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by recipient name or note..."
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={handleSearchChange}
        />
        {isSearching ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 6 }} />
        ) : !!search ? (
          <TouchableOpacity onPress={() => handleSearchChange('')}>
            <MaterialCommunityIcons name="close-circle" size={18} color={colors.muted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Payments List */}
      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading ledger...</Text>
        </View>
      ) : (
        <FlatList
          data={payments}
          keyExtractor={item => item._id}
          renderItem={renderPaymentCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons name="receipt-text-outline" size={48} color={colors.border} />
              <Text style={styles.emptyTitle}>No payments recorded yet</Text>
              <Text style={styles.emptySubtitle}>Tap the button below to add your first payment entry.</Text>
            </View>
          }
        />
      )}

      {/* Bottom Fixed Action Button: "+ Add Payment" */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setEditingItem(null);
            setModalVisible(true);
          }}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="plus" size={22} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.addButtonText}>Add Payment</Text>
        </TouchableOpacity>
      </View>

      {/* Add / Edit Modal */}
      <PaymentModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setEditingItem(null);
        }}
        onSave={handleSavePayment}
        editItem={editingItem}
        userName={user?.name}
      />

      {/* Custom Popup / Alert Modal */}
      <CustomAlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        isDestructive={alertConfig.isDestructive}
        onConfirm={alertConfig.onConfirm || (() => setAlertConfig(prev => ({ ...prev, visible: false })))}
        onCancel={alertConfig.onCancel}
      />

      {/* Global Action Loader Modal */}
      <LoadingModal
        visible={!!actionLoadingMessage}
        message={actionLoadingMessage || 'Please wait...'}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 38
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  totalBlock: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '600',
    marginBottom: 2,
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.heading,
  },
  totalCount: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  userBlock: {
    alignItems: 'flex-end',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    maxWidth: 90,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.heading,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.heading,
  },
  pdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: '#FED7AA',
    backgroundColor: '#FFF4E8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pdfBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1.2,
    borderColor: colors.border,
    marginBottom: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 90,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  recipientName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  cardAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.heading,
  },
  cardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 13,
    color: colors.muted,
    marginLeft: 4,
  },
  methodChip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  methodChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  noteBox: {
    backgroundColor: '#FAFAF9',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  noteText: {
    fontSize: 13,
    color: colors.muted,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#F5EFE6',
    paddingTop: 8,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
    paddingVertical: 4,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 4,
  },
  deleteBtn: {},
  deleteBtnText: {
    color: colors.danger,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: colors.muted,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 4,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(255, 248, 239, 0.95)',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  addButton: {
    backgroundColor: colors.primary,
    height: 50,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

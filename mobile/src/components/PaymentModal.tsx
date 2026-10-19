import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { DatePickerModal } from './DatePickerModal';
import { CustomAlertModal, AlertModalConfig } from './CustomAlertModal';
import { LoadingModal } from './LoadingModal';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { colors } from '../theme/colors';
import { PaymentItem } from '../services/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatDateToDDMMYYYY, getTodayDDMMYYYY } from '../utils/date';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (data: {
    recipientName: string;
    amount: number;
    paymentDate: string;
    paymentMethod: 'Cash' | 'UPI' | 'Bank';
    note?: string;
  }) => Promise<void>;
  editItem?: PaymentItem | null;
  userName?: string;
}

export const PaymentModal: React.FC<Props> = ({
  visible,
  onClose,
  onSave,
  editItem,
  userName,
}) => {
  const [recipientName, setRecipientName] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Bank'>('Cash');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertModalConfig>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  useEffect(() => {
    if (editItem) {
      setRecipientName(editItem.recipientName);
      setAmount(editItem.amount.toString());
      setPaymentDate(formatDateToDDMMYYYY(editItem.paymentDate));
      setPaymentMethod(editItem.paymentMethod);
      setNote(editItem.note || '');
    } else {
      setRecipientName('');
      setAmount('');
      setPaymentDate(getTodayDDMMYYYY());
      setPaymentMethod('Cash');
      setNote('');
    }
    setShowDatePicker(false);
  }, [editItem, visible]);

  const handleSubmit = async () => {
    if (!recipientName.trim()) {
      setAlertConfig({
        visible: true,
        title: 'Notice',
        message: 'Recipient name is required.',
        type: 'warning',
        onConfirm: () => setAlertConfig(prev => ({ ...prev, visible: false })),
      });
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setAlertConfig({
        visible: true,
        title: 'Notice',
        message: 'Please enter a valid amount greater than 0.',
        type: 'warning',
        onConfirm: () => setAlertConfig(prev => ({ ...prev, visible: false })),
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        recipientName: recipientName.trim(),
        amount: numAmount,
        paymentDate: paymentDate.trim() || getTodayDDMMYYYY(),
        paymentMethod,
        note: note.trim(),
      });
      onClose();
    } catch (err: any) {
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: err.message || 'Failed to save payment.',
        type: 'danger',
        onConfirm: () => setAlertConfig(prev => ({ ...prev, visible: false })),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.modalTitle}>
                {editItem ? 'Edit Payment' : 'Add New Payment'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {editItem ? 'Update previously saved details' : 'This entry will be saved to your account'}
              </Text>
            </View>
            <View style={{ width: 32 }} />
          </View>

          <KeyboardAwareScrollView
            style={styles.formScroll}
            contentContainerStyle={styles.scrollContentContainer}
            enableOnAndroid={true}
            extraScrollHeight={Platform.OS === 'android' ? 60 : 30}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Recipient Name */}
            <Text style={styles.label}>Paid To (Recipient) *</Text>
            <View style={styles.inputBox}>
              <MaterialCommunityIcons name="account-cash" size={20} color={colors.muted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. Catering, Mandap, Sound System"
                placeholderTextColor={colors.muted}
                value={recipientName}
                onChangeText={setRecipientName}
              />
            </View>

            {/* Amount */}
            <Text style={styles.label}>Amount (₹) *</Text>
            <View style={styles.inputBox}>
              <Text style={styles.rupeeSymbol}>₹</Text>
              <TextInput
                style={[styles.input, styles.amountInput]}
                placeholder="0.00"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />
            </View>

            {/* Payment Date - Picker Trigger */}
            <Text style={styles.label}>Payment Date *</Text>
            <TouchableOpacity
              style={styles.inputBox}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="calendar-month-outline"
                size={20}
                color={colors.primary}
                style={styles.inputIcon}
              />
              <Text style={styles.dateDisplayText}>
                {paymentDate || 'Select Date'}
              </Text>
              <MaterialCommunityIcons name="calendar-edit" size={18} color={colors.muted} />
            </TouchableOpacity>

            {/* Interactive Calendar Date Picker Modal */}
            <DatePickerModal
              visible={showDatePicker}
              currentDateString={paymentDate}
              onSelectDate={(newDate) => setPaymentDate(newDate)}
              onClose={() => setShowDatePicker(false)}
            />

            {/* Payment Method Chips */}
            <Text style={styles.label}>Payment Method</Text>
            <View style={styles.methodRow}>
              {(['Cash', 'UPI', 'Bank'] as const).map(method => {
                const isSelected = paymentMethod === method;
                return (
                  <TouchableOpacity
                    key={method}
                    style={[
                      styles.methodChip,
                      isSelected && styles.methodChipSelected,
                    ]}
                    onPress={() => setPaymentMethod(method)}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons
                      name={
                        method === 'Cash'
                          ? 'cash-multiple'
                          : method === 'UPI'
                          ? 'cellphone-wireless'
                          : 'bank-outline'
                      }
                      size={18}
                      color={isSelected ? colors.primary : colors.muted}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.methodChipText,
                        isSelected && styles.methodChipTextSelected,
                      ]}
                    >
                      {method}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Note */}
            <Text style={styles.label}>Note (Optional)</Text>
            <TextInput
              style={[styles.inputBox, styles.noteInput]}
              placeholder="Short note about this payment (e.g. Advance paid)"
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              value={note}
              onChangeText={setNote}
            />

            {/* Entry Creator Info */}
            {userName && (
              <View style={styles.identityRow}>
                <View style={styles.avatarMini}>
                  <Text style={styles.avatarMiniText}>{userName.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.identityText}>Recorded by: {userName}</Text>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.saveBtn, isSubmitting && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveBtnText}>
                  {editItem ? 'Save Changes' : 'Save Payment'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </KeyboardAwareScrollView>
        </View>
      </View>

      <CustomAlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm || (() => setAlertConfig(prev => ({ ...prev, visible: false })))}
      />

      <LoadingModal
        visible={isSubmitting}
        message={editItem ? 'Saving changes...' : 'Saving payment...'}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  closeBtn: {
    padding: 6,
  },
  headerCenter: {
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.heading,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  formScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  scrollContentContainer: {
    paddingBottom: 40,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    marginTop: 10,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.2,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  dateDisplayText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  rupeeSymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.heading,
    marginRight: 6,
  },
  amountInput: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.heading,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  methodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  methodChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    backgroundColor: colors.surface,
    borderWidth: 1.2,
    borderColor: colors.border,
    borderRadius: 10,
    marginHorizontal: 4,
  },
  methodChipSelected: {
    borderColor: colors.primary,
    backgroundColor: '#FFF4E8',
  },
  methodChipText: {
    fontSize: 14,
    color: colors.muted,
    fontWeight: '600',
  },
  methodChipTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  noteInput: {
    height: 80,
    paddingTop: 10,
    paddingBottom: 10,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 6,
    backgroundColor: colors.surface,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarMini: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarMiniText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  identityText: {
    fontSize: 13,
    color: colors.muted,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 20,
  },
  cancelBtnText: {
    fontSize: 15,
    color: colors.muted,
    fontWeight: '600',
  },
});

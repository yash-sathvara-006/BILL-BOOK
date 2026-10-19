import React from 'react';
import { Modal, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface Props {
  visible: boolean;
  message?: string;
}

export const LoadingModal: React.FC<Props> = ({
  visible,
  message = 'Please wait...',
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.spinnerWrapper}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.surface,
    paddingVertical: 24,
    paddingHorizontal: 28,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 180,
    maxWidth: 280,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  spinnerWrapper: {
    marginBottom: 14,
  },
  message: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.heading,
    textAlign: 'center',
  },
});

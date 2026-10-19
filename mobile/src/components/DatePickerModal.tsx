import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { colors } from '../theme/colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { parseDDMMYYYY, formatDateToDDMMYYYY, getTodayDDMMYYYY } from '../utils/date';

interface Props {
  visible: boolean;
  currentDateString?: string; // DD-MM-YYYY or legacy YYYY-MM-DD
  onSelectDate: (dateString: string) => void;
  onClose: () => void;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const DatePickerModal: React.FC<Props> = ({
  visible,
  currentDateString,
  onSelectDate,
  onClose,
}) => {
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth()); // 0-indexed

  useEffect(() => {
    if (visible) {
      const d = parseDDMMYYYY(currentDateString);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [visible, currentDateString]);

  const todayString = getTodayDDMMYYYY();
  const selectedFormatted = formatDateToDDMMYYYY(currentDateString);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const handleDayPress = (day: number) => {
    const dd = String(day).padStart(2, '0');
    const mm = String(viewMonth + 1).padStart(2, '0');
    const formatted = `${dd}-${mm}-${viewYear}`;
    onSelectDate(formatted);
    onClose();
  };

  const handleSelectToday = () => {
    onSelectDate(todayString);
    onClose();
  };

  // Calendar math
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 for Sunday
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const daysArray = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    daysArray.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysArray.push(d);
  }

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.calendarCard}>
              {/* Header: Month & Year Navigator */}
              <View style={styles.header}>
                <TouchableOpacity onPress={handlePrevMonth} style={styles.arrowBtn}>
                  <MaterialCommunityIcons name="chevron-left" size={26} color={colors.heading} />
                </TouchableOpacity>

                <Text style={styles.monthTitle}>
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </Text>

                <TouchableOpacity onPress={handleNextMonth} style={styles.arrowBtn}>
                  <MaterialCommunityIcons name="chevron-right" size={26} color={colors.heading} />
                </TouchableOpacity>
              </View>

              {/* Day Labels Row */}
              <View style={styles.weekRow}>
                {WEEK_DAYS.map((wd, index) => (
                  <Text key={index} style={styles.weekDayText}>
                    {wd}
                  </Text>
                ))}
              </View>

              {/* Days Grid */}
              <View style={styles.daysGrid}>
                {daysArray.map((day, idx) => {
                  if (day === null) {
                    return <View key={idx} style={styles.dayCell} />;
                  }

                  const dd = String(day).padStart(2, '0');
                  const mm = String(viewMonth + 1).padStart(2, '0');
                  const dayStr = `${dd}-${mm}-${viewYear}`;
                  const isSelected = dayStr === selectedFormatted;
                  const isToday = dayStr === todayString;

                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.dayCell,
                        isSelected && styles.selectedCell,
                        isToday && !isSelected && styles.todayCell,
                      ]}
                      onPress={() => handleDayPress(day)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          isSelected && styles.selectedDayText,
                          isToday && !isSelected && styles.todayDayText,
                        ]}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Footer Actions */}
              <View style={styles.footerRow}>
                <TouchableOpacity onPress={handleSelectToday} style={styles.todayBtn}>
                  <MaterialCommunityIcons name="calendar-today" size={16} color={colors.primary} />
                  <Text style={styles.todayBtnText}>Today</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  calendarCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  arrowBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FAF5EE',
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.heading,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 6,
  },
  weekDayText: {
    width: 38,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dayCell: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 3,
    borderRadius: 19,
  },
  selectedCell: {
    backgroundColor: colors.primary,
  },
  todayCell: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  dayText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  selectedDayText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  todayDayText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  todayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#FFF4E8',
  },
  todayBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 4,
  },
  closeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
  },
});

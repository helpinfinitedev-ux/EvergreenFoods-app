import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Minus, Layers, User as UserIcon } from 'lucide-react-native';
import { Colors } from '../../../constants/Colors';
import { AuthService, User } from '../../../services/authService';
import { DataService, Transaction } from '../../../services/dataService';

export default function PaltiEntry() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [transferDriverName, setTransferDriverName] = useState('');
    const [kg, setKg] = useState('');
    const [action, setAction] = useState<'ADD' | 'SUBTRACT'>('ADD');
    const [itemType, setItemType] = useState<'Boiler' | 'Chiller'>('Boiler');

    // History State
    const [history, setHistory] = useState<Transaction[]>([]);

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            const currentUser = await AuthService.getCurrentUser();
            setUser(currentUser);

            const historyData = await DataService.getPaltiHistory();
            setHistory(historyData);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!transferDriverName || !kg) {
            Alert.alert('Missing Fields', 'Please fill all fields.');
            return;
        }

        setSubmitting(true);
        try {
            const newEntry = await DataService.addPaltiEntry({
                type: 'PALTI',
                paltiAction: action,
                amount: parseFloat(kg),
                unit: 'KG',
                date: new Date().toISOString(),
                transferDriverName: transferDriverName,
                itemType: itemType,
                details: `${action === 'ADD' ? 'Stock In' : 'Stock Out'} - ${transferDriverName}`,
            });

            // Refresh history and reset form
            const updatedHistory = await DataService.getPaltiHistory();
            setHistory(updatedHistory);

            setTransferDriverName('');
            setKg('');
            setItemType('Boiler');
            setAction('ADD');

            Alert.alert('Success', 'Entry submitted successfully!');
        } catch (error) {
            Alert.alert('Error', 'Failed to submit entry.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color="#0A84FF" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <Text style={styles.headerTitle}>Palti Entry</Text>

            {/* Form Section */}
            <View style={styles.card}>
                {/* Driver Name (Locked) */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Driver Name</Text>
                    <View style={[styles.inputContainer, styles.lockedInput]}>
                        <UserIcon size={20} color="#666" style={styles.inputIcon} />
                        <Text style={styles.lockedText}>{user?.name || 'Unknown Driver'}</Text>
                    </View>
                </View>

                {/* Transfer Driver Name */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Transfer Driver Name</Text>
                    <TextInput
                        style={styles.input}
                        value={transferDriverName}
                        onChangeText={setTransferDriverName}
                        placeholder="Enter driver name"
                        placeholderTextColor="#666"
                    />
                </View>

                {/* KG */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Weight (KG)</Text>
                    <TextInput
                        style={styles.input}
                        value={kg}
                        onChangeText={setKg}
                        placeholder="e.g. 1000.700"
                        placeholderTextColor="#666"
                        keyboardType="numeric"
                    />
                </View>

                {/* Action Selection */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Action</Text>
                    <View style={styles.actionGroup}>
                        <TouchableOpacity
                            style={[
                                styles.actionButton,
                                action === 'ADD' && styles.actionButtonAdd
                            ]}
                            onPress={() => setAction('ADD')}
                        >
                            <Plus size={24} color={action === 'ADD' ? '#fff' : '#30D158'} />
                            <Text style={[styles.actionText, action === 'ADD' && styles.textWhite]}>Stock In (Add)</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.actionButton,
                                action === 'SUBTRACT' && styles.actionButtonSub
                            ]}
                            onPress={() => setAction('SUBTRACT')}
                        >
                            <Minus size={24} color={action === 'SUBTRACT' ? '#fff' : '#FF453A'} />
                            <Text style={[styles.actionText, action === 'SUBTRACT' && styles.textWhite]}>Stock Out (Sub)</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Type Selection */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Type</Text>
                    <View style={styles.radioGroup}>
                        <TouchableOpacity
                            style={[styles.radioButton, itemType === 'Boiler' && styles.radioButtonActive]}
                            onPress={() => setItemType('Boiler')}
                        >
                            <Text style={[styles.radioText, itemType === 'Boiler' && styles.radioTextActive]}>Boiler</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.radioButton, itemType === 'Chiller' && styles.radioButtonActive]}
                            onPress={() => setItemType('Chiller')}
                        >
                            <Text style={[styles.radioText, itemType === 'Chiller' && styles.radioTextActive]}>Chiller</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    style={[styles.submitButton, submitting && styles.buttonDisabled]}
                    onPress={handleSubmit}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Layers size={20} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.submitButtonText}>Submit Entry</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* History Section */}
            <View style={styles.historyContainer}>
                <Text style={styles.historyTitle}>Last 7 Days History</Text>
                {history.length === 0 ? (
                    <Text style={styles.emptyText}>No recent palti entries.</Text>
                ) : (
                    history.map((item) => (
                        <View key={item.id} style={styles.historyItem}>
                            <View style={styles.historyLeft}>
                                <Text style={styles.historyCompany}>To: {item.transferDriverName || 'Unknown'}</Text>
                                <Text style={styles.historyDate}>
                                    {new Date(item.date).toLocaleDateString()} • {item.itemType}
                                </Text>
                            </View>
                            <View style={styles.historyRight}>
                                <View style={[
                                    styles.badge,
                                    item.paltiAction === 'ADD' ? styles.badgeSuccess : styles.badgeError
                                ]}>
                                    <Text style={styles.badgeText}>
                                        {item.paltiAction === 'ADD' ? '+' : '-'} {item.amount} {item.unit}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    ))
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    contentContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 24,
    },
    card: {
        backgroundColor: '#1C1C1E',
        borderRadius: 20,
        padding: 20,
        gap: 20,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        color: '#888',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2C2C2E',
        borderRadius: 12,
        height: 50,
        paddingHorizontal: 16,
    },
    lockedInput: {
        backgroundColor: '#252527',
        opacity: 0.8,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        backgroundColor: '#2C2C2E',
        height: 50,
        borderRadius: 12,
        paddingHorizontal: 16,
    },
    lockedText: {
        color: '#aaa',
        fontSize: 16,
        fontWeight: '500',
    },
    actionGroup: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        height: 60,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#2C2C2E',
        flexDirection: 'row',
        gap: 8,
    },
    actionButtonAdd: {
        backgroundColor: '#30D158',
        borderColor: '#30D158',
    },
    actionButtonSub: {
        backgroundColor: '#FF453A',
        borderColor: '#FF453A',
    },
    actionText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#888',
    },
    textWhite: {
        color: '#fff',
    },
    radioGroup: {
        flexDirection: 'row',
        gap: 12,
    },
    radioButton: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#2C2C2E',
    },
    radioButtonActive: {
        backgroundColor: '#0A84FF',
        borderColor: '#0A84FF',
    },
    radioText: {
        color: '#888',
        fontSize: 16,
        fontWeight: '600',
    },
    radioTextActive: {
        color: '#fff',
    },
    submitButton: {
        backgroundColor: '#BF5AF2', // Purple for Palti
        height: 56,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    historyContainer: {
        marginTop: 32,
    },
    historyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 16,
    },
    emptyText: {
        color: '#666',
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 20,
    },
    historyItem: {
        backgroundColor: '#1C1C1E',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    historyLeft: {
        flex: 1,
    },
    historyCompany: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    historyDate: {
        color: '#666',
        fontSize: 12,
    },
    historyRight: {
        alignItems: 'flex-end',
    },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    badgeSuccess: {
        backgroundColor: 'rgba(48, 209, 88, 0.2)',
    },
    badgeError: {
        backgroundColor: 'rgba(255, 69, 58, 0.2)',
    },
    badgeText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
});

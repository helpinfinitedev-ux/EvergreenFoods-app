import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    TextInput,
    ActivityIndicator,
    Alert,
    Modal,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search, ChevronRight, Users } from 'lucide-react-native';
import { DataService, Customer } from '../../../services/dataService';
import { Colors } from '../../../constants/Colors';

export default function CustomersPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [advanceModalVisible, setAdvanceModalVisible] = useState(false);
    const [advanceAmount, setAdvanceAmount] = useState('');
    const [advanceDetails, setAdvanceDetails] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [savingAdvance, setSavingAdvance] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await DataService.getCustomers();
            setCustomers(data);
        } catch (error) {
            Alert.alert('Error', 'Failed to load customers');
        } finally {
            setLoading(false);
        }
    };

    const openAdvanceModal = (customer: Customer) => {
        setSelectedCustomer(customer);
        setAdvanceAmount('');
        setAdvanceDetails('');
        setAdvanceModalVisible(true);
    };

    const submitAdvance = async () => {
        if (!selectedCustomer) return;
        const numericAmount = Number(advanceAmount);
        if (Number.isNaN(numericAmount) || numericAmount <= 0) {
            Alert.alert('Invalid amount', 'Please enter a valid advance amount.');
            return;
        }

        try {
            setSavingAdvance(true);
            const response = await DataService.addCustomerAdvance(
                selectedCustomer.id,
                numericAmount,
                advanceDetails.trim() || undefined
            );
            const updatedCustomer = response.customer || response;
            setCustomers(prev =>
                prev.map(c => (c.id === selectedCustomer.id ? { ...c, balance: updatedCustomer.balance } : c))
            );
            setAdvanceModalVisible(false);
        } catch (error) {
            Alert.alert('Error', 'Failed to add advance');
        } finally {
            setSavingAdvance(false);
        }
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.mobile.includes(searchQuery)
    );

    const renderItem = ({ item, index }: { item: Customer; index: number }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => router.push({
                pathname: '/customer/[id]',
                params: { id: item.id }
            })}
        >
            <View style={styles.cardLeft}>
                <Text style={styles.indexText}>{index + 1}.</Text>
                <View>
                    <Text style={styles.nameText}>{item.name}</Text>
                    <Text style={styles.mobileText}>{item.mobile}</Text>
                </View>
            </View>
            <View style={styles.cardRight}>
                <Text style={styles.dueLabel}>Due Amount</Text>
                <Text style={styles.dueAmount}>₹ {item.balance.toLocaleString()}</Text>
                <TouchableOpacity
                    style={styles.advanceButton}
                    onPress={() => openAdvanceModal(item)}
                >
                    <Text style={styles.advanceButtonText}>Add Advance</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color="#0A84FF" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Customers</Text>
            </View>

            <View style={styles.searchContainer}>
                <Search size={20} color="#666" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name or mobile"
                    placeholderTextColor="#666"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            <FlatList
                data={filteredCustomers}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>No customers found.</Text>
                }
            />

            <Modal visible={advanceModalVisible} transparent animationType="slide">
                <KeyboardAvoidingView
                    style={styles.modalBackdrop}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Add Advance</Text>
                        <Text style={styles.modalSubtitle}>
                            {selectedCustomer ? selectedCustomer.name : ''}
                        </Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Advance amount"
                            placeholderTextColor="#666"
                            keyboardType="numeric"
                            value={advanceAmount}
                            onChangeText={setAdvanceAmount}
                        />
                        <TextInput
                            style={[styles.modalInput, styles.modalInputMultiline]}
                            placeholder="Details (optional)"
                            placeholderTextColor="#666"
                            value={advanceDetails}
                            onChangeText={setAdvanceDetails}
                            multiline
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalCancel}
                                onPress={() => setAdvanceModalVisible(false)}
                                disabled={savingAdvance}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalSubmit}
                                onPress={submitAdvance}
                                disabled={savingAdvance}
                            >
                                {savingAdvance ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.modalSubmitText}>Save</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1C1C1E',
        marginHorizontal: 16,
        borderRadius: 12,
        paddingHorizontal: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#333',
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        height: 48,
        color: '#fff',
        fontSize: 16,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    card: {
        backgroundColor: '#1C1C1E',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    cardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    indexText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '700',
        width: 30,
    },
    nameText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    mobileText: {
        color: '#888',
        fontSize: 12,
    },
    cardRight: {
        alignItems: 'flex-end',
    },
    dueLabel: {
        color: '#888',
        fontSize: 10,
        textTransform: 'uppercase',
    },
    dueAmount: {
        color: '#FF453A', // Red for Dues
        fontSize: 16,
        fontWeight: '700',
    },
    advanceButton: {
        marginTop: 8,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 10,
        backgroundColor: '#2C2C2E',
        borderWidth: 1,
        borderColor: '#3A3A3C',
    },
    advanceButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    emptyText: {
        color: '#666',
        textAlign: 'center',
        fontStyle: 'italic',
        marginTop: 20,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.65)',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    modalCard: {
        backgroundColor: '#1C1C1E',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    modalTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    modalSubtitle: {
        color: '#888',
        marginTop: 4,
        marginBottom: 12,
    },
    modalInput: {
        backgroundColor: '#0F0F10',
        color: '#fff',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: '#2C2C2E',
        marginBottom: 10,
    },
    modalInputMultiline: {
        minHeight: 70,
        textAlignVertical: 'top',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    modalCancel: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#3A3A3C',
    },
    modalCancelText: {
        color: '#bbb',
        fontWeight: '600',
    },
    modalSubmit: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 10,
        backgroundColor: '#0A84FF',
    },
    modalSubmitText: {
        color: '#fff',
        fontWeight: '700',
    },
});

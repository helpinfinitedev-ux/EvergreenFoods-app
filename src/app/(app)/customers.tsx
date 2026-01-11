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
    emptyText: {
        color: '#666',
        textAlign: 'center',
        fontStyle: 'italic',
        marginTop: 20,
    },
});

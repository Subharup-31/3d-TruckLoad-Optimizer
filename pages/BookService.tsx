import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Truck,
    ArrowLeft,
    Upload,
    FileSpreadsheet,
    CheckCircle,
    AlertCircle,
    Calendar,
    MapPin,
    User,
    Phone,
    Check,
    Edit2,
    Trash2,
    Package,
    Sparkles
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { AuthService } from '../services/auth';
import { CameraDimensionScanner } from '../components/CameraDimensionScanner';

interface Dimensions {
    length: number;
    width: number;
    height: number;
}

interface ItemDetails {
    id: string;
    name: string;
    quantity: number;
    weight: number;
    dimensions: Dimensions;
    fragile: boolean;
    stackable: boolean;
    image?: string;
}

export const BookService: React.FC = () => {
    const navigate = useNavigate();
    const [inputMode, setInputMode] = useState<'excel' | 'manual'>('manual');
    const [showScanner, setShowScanner] = useState(false);

    const [formData, setFormData] = useState({
        customerName: '',
        customerPhone: '',
        pickupLocation: '',
        dropLocation: '',
        scheduledTime: ''
    });

    // Excel upload state
    const [file, setFile] = useState<File | null>(null);
    const [parsedItems, setParsedItems] = useState<any[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);

    // Manual item entry state
    const [items, setItems] = useState<ItemDetails[]>([]);
    const [currentItem, setCurrentItem] = useState<ItemDetails>({
        id: '',
        name: '',
        quantity: 1,
        weight: 0,
        dimensions: {
            length: 0,
            width: 0,
            height: 0
        },
        fragile: false,
        stackable: false
    });
    const [editingItemId, setEditingItemId] = useState<string | null>(null);

    const [error, setError] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            parseExcel(selectedFile);
        }
    };

    const parseExcel = (file: File) => {
        setIsUploading(true);
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet);

                setParsedItems(jsonData);
                setUploadSuccess(true);
                setError('');
            } catch (err) {
                setError('Failed to parse Excel file. Please ensure it is a valid .xlsx or .csv file.');
                setUploadSuccess(false);
            } finally {
                setIsUploading(false);
            }
        };

        reader.onerror = () => {
            setError('Error reading file.');
            setIsUploading(false);
        };

        reader.readAsBinaryString(file);
    };

    const handleSaveItem = () => {
        if (!currentItem.name.trim()) {
            setError('Please enter an item name');
            return;
        }

        if (editingItemId) {
            setItems(items.map(item =>
                item.id === editingItemId ? { ...currentItem, id: editingItemId } : item
            ));
            setEditingItemId(null);
        } else {
            const newItem: ItemDetails = {
                ...currentItem,
                id: `item-${Date.now()}`
            };
            setItems([...items, newItem]);
        }

        setCurrentItem({
            id: '',
            name: '',
            quantity: 1,
            weight: 0,
            dimensions: { length: 0, width: 0, height: 0 },
            fragile: false,
            stackable: false
        });
        setError('');
    };

    const handleEditItem = (item: ItemDetails) => {
        setCurrentItem(item);
        setEditingItemId(item.id);
    };

    const handleDeleteItem = (id: string) => {
        setItems(items.filter(item => item.id !== id));
    };

    const handleCancelEdit = () => {
        setCurrentItem({
            id: '',
            name: '',
            quantity: 1,
            weight: 0,
            dimensions: { length: 0, width: 0, height: 0 },
            fragile: false,
            stackable: false
        });
        setEditingItemId(null);
        setError('');
    };


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const itemsToSubmit = inputMode === 'excel' ? parsedItems : items;

        if (itemsToSubmit.length === 0) {
            setError(inputMode === 'excel'
                ? 'Please upload a valid Excel file with items to ship.'
                : 'Please add at least one item to your booking.');
            return;
        }

        try {
            AuthService.createBooking({
                customerName: formData.customerName,
                customerPhone: formData.customerPhone,
                pickupLocation: formData.pickupLocation,
                dropLocation: formData.dropLocation,
                scheduledTime: formData.scheduledTime,
                items: itemsToSubmit
            });

            alert('Booking request submitted successfully! Our admin will review and assign a truck shortly.');
            navigate('/');
        } catch (err) {
            setError('Failed to submit booking. Please try again.');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
            {/* Animated background gradients */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-500/10 dark:bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                <div className="absolute top-0 -right-4 w-96 h-96 bg-blue-500/10 dark:bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-500/10 dark:bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
            </div>

            {/* Header */}
            <header className="relative z-10 backdrop-blur-sm bg-white/80 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex justify-between items-center">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                        <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-xl shadow-md">
                            <Truck className="w-7 h-7 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                            LogiLoad Booking
                        </h1>
                    </div>
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Back to Home
                    </button>
                </div>
            </header>

            <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-8">
                        <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 mb-4">
                            <Sparkles className="w-4 h-4 text-white" />
                            <span className="text-sm font-medium text-white">Fast & Easy Booking</span>
                        </div>
                        <h2 className="text-4xl font-bold text-white mb-2">Book a Service</h2>
                        <p className="text-blue-100">Fill in the details and add your items to get started.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-8">
                        {/* Contact Details */}
                        <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-2xl p-6">
                            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                Contact Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.customerName}
                                        onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                                        className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Phone Number
                                    </label>
                                    <input
                                        type="tel"
                                        required
                                        value={formData.customerPhone}
                                        onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                                        className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                                        placeholder="+91 98765 43210"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Locations */}
                        <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-2xl p-6">
                            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-emerald-600 dark:text-green-400" />
                                Delivery Details
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Pickup Location
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.pickupLocation}
                                        onChange={(e) => setFormData({ ...formData, pickupLocation: e.target.value })}
                                        className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                                        placeholder="Enter pickup address"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Drop Location
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.dropLocation}
                                        onChange={(e) => setFormData({ ...formData, dropLocation: e.target.value })}
                                        className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                                        placeholder="Enter drop address"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Scheduled Date & Time
                                    </label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={formData.scheduledTime}
                                        onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                                        className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Input Mode Toggle */}
                        <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-2xl p-6">
                            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">Add Items</h3>
                            <div className="flex gap-4 mb-6">
                                <button
                                    type="button"
                                    onClick={() => setInputMode('manual')}
                                    className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${inputMode === 'manual'
                                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md shadow-blue-500/30'
                                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                                        }`}
                                >
                                    <Package className="w-5 h-5 inline-block mr-2" />
                                    Add Items Manually
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setInputMode('excel')}
                                    className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${inputMode === 'excel'
                                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md shadow-blue-500/30'
                                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                                        }`}
                                >
                                    <FileSpreadsheet className="w-5 h-5 inline-block mr-2" />
                                    Upload Excel File
                                </button>
                            </div>

                            {/* Manual Item Entry */}
                            {inputMode === 'manual' && (
                                <div className="space-y-6">
                                    <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
                                        <h4 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
                                            {editingItemId ? 'Edit Item Details' : 'New Item Details'}
                                        </h4>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {/* Left Column */}
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                        Item Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={currentItem.name}
                                                        onChange={(e) => setCurrentItem({ ...currentItem, name: e.target.value })}
                                                        className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                                                        placeholder="e.g., 55 inch TV Box"
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                            Quantity
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={currentItem.quantity}
                                                            onChange={(e) => setCurrentItem({ ...currentItem, quantity: Number(e.target.value) })}
                                                            className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                            Weight (kg)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.1"
                                                            value={currentItem.weight}
                                                            onChange={(e) => setCurrentItem({ ...currentItem, weight: Number(e.target.value) })}
                                                            className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                                                            placeholder="e.g., 25.5"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-6">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={currentItem.fragile}
                                                            onChange={(e) => setCurrentItem({ ...currentItem, fragile: e.target.checked })}
                                                            className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                                        />
                                                        <span className="text-sm text-slate-700 dark:text-slate-300">Fragile</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={currentItem.stackable}
                                                            onChange={(e) => setCurrentItem({ ...currentItem, stackable: e.target.checked })}
                                                            className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                                        />
                                                        <span className="text-sm text-slate-700 dark:text-slate-300">Stackable</span>
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Right Column - Dimensions */}
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                            Dimensions (L x W x H)
                                                        </label>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowScanner(true)}
                                                        className="text-xs flex items-center gap-1 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 px-2 py-1 rounded text-blue-600 dark:text-blue-400 font-semibold transition"
                                                    >
                                                        <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-300" /> AI Scan
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-3 gap-3">
                                                    <div>
                                                        <label className="block text-xs text-slate-500 mb-1">LENGTH (CM)</label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={currentItem.dimensions.length}
                                                            onChange={(e) => setCurrentItem({
                                                                ...currentItem,
                                                                dimensions: { ...currentItem.dimensions, length: Number(e.target.value) }
                                                            })}
                                                            className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs text-slate-500 mb-1">WIDTH (CM)</label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={currentItem.dimensions.width}
                                                            onChange={(e) => setCurrentItem({
                                                                ...currentItem,
                                                                dimensions: { ...currentItem.dimensions, width: Number(e.target.value) }
                                                            })}
                                                            className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs text-slate-500 mb-1">HEIGHT (CM)</label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={currentItem.dimensions.height}
                                                            onChange={(e) => setCurrentItem({
                                                                ...currentItem,
                                                                dimensions: { ...currentItem.dimensions, height: Number(e.target.value) }
                                                            })}
                                                            className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                                            <button
                                                type="button"
                                                onClick={handleCancelEdit}
                                                className="px-6 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleSaveItem}
                                                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-colors shadow-md hover:shadow-blue-500/30"
                                            >
                                                {editingItemId ? 'Update Item' : 'Save Item'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Items List */}
                                    {items.length > 0 && (
                                        <div className="bg-white dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
                                            <h4 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
                                                Added Items ({items.length})
                                            </h4>
                                            <div className="space-y-3">
                                                {items.map((item) => (
                                                    <div key={item.id} className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4 flex items-center justify-between hover:border-blue-500/30 transition-colors">
                                                        <div className="flex-1">
                                                            <h5 className="font-semibold text-slate-900 dark:text-white">{item.name}</h5>
                                                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                                                Qty: {item.quantity} | Weight: {item.weight}kg |
                                                                Dimensions: {item.dimensions.length}×{item.dimensions.width}×{item.dimensions.height}cm
                                                            </p>
                                                            <div className="flex gap-2 mt-2">
                                                                {item.fragile && (
                                                                    <span className="text-xs bg-red-500/10 text-red-600 dark:text-red-300 px-2 py-0.5 rounded border border-red-500/20">Fragile</span>
                                                                )}
                                                                {item.stackable && (
                                                                    <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-green-300 px-2 py-0.5 rounded border border-emerald-500/20">Stackable</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2 ml-4">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleEditItem(item)}
                                                                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteItem(item.id)}
                                                                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Excel Upload */}
                            {inputMode === 'excel' && (
                                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-12 hover:bg-slate-50 dark:hover:bg-slate-800/30 hover:border-blue-400 transition-all cursor-pointer">
                                    <div className="text-center">
                                        <FileSpreadsheet className="mx-auto h-16 w-16 text-slate-400 dark:text-slate-500 mb-4" />
                                        <div className="mt-4 flex text-sm leading-6 text-slate-600 dark:text-slate-400 justify-center">
                                            <label
                                                htmlFor="file-upload"
                                                className="relative cursor-pointer rounded-md font-semibold text-blue-600 dark:text-blue-400 focus-within:outline-none hover:text-blue-500"
                                            >
                                                <span>Upload a file</span>
                                                <input
                                                    id="file-upload"
                                                    name="file-upload"
                                                    type="file"
                                                    className="sr-only"
                                                    accept=".xlsx,.xls,.csv"
                                                    onChange={handleFileChange}
                                                />
                                            </label>
                                            <p className="pl-1">or drag and drop</p>
                                        </div>
                                        <p className="text-xs leading-5 text-slate-500 mt-2">Excel or CSV up to 10MB</p>
                                    </div>

                                    {file && (
                                        <div className={`mt-6 p-4 rounded-xl flex items-center gap-3 border ${uploadSuccess ? 'bg-emerald-500/10 text-emerald-700 dark:text-green-300 border-emerald-500/30' : 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30'}`}>
                                            {isUploading ? (
                                                <Upload className="w-5 h-5 animate-bounce" />
                                            ) : uploadSuccess ? (
                                                <CheckCircle className="w-5 h-5" />
                                            ) : (
                                                <FileSpreadsheet className="w-5 h-5" />
                                            )}
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">{file.name}</p>
                                                {uploadSuccess && (
                                                    <p className="text-xs mt-1">Successfully parsed {parsedItems.length} items</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="p-4 bg-red-500/10 text-red-600 dark:text-red-300 rounded-xl border border-red-500/30 flex items-center gap-3">
                                <AlertCircle className="w-5 h-5" />
                                <p className="text-sm">{error}</p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={(inputMode === 'excel' && (!uploadSuccess || isUploading)) || (inputMode === 'manual' && items.length === 0)}
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl hover:shadow-blue-500/30 hover:scale-[1.01]"
                            >
                                {isUploading ? 'Processing...' : 'Submit Booking Request'}
                            </button>
                        </div>
                    </form>
                </div>

            </main>

            {showScanner && (
                <CameraDimensionScanner
                    onScanComplete={(dims) => {
                        setCurrentItem(prev => ({
                            ...prev,
                            dimensions: dims,
                            weight: prev.weight || Math.round((dims.length * dims.width * dims.height) / 1000)
                        }));
                    }}
                    onClose={() => setShowScanner(false)}
                />
            )}
        </div>
    );
};

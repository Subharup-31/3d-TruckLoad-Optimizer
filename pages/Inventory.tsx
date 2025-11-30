import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import { Plus, Trash2, Box, Upload, Edit } from 'lucide-react';
import { Item, Dimensions } from '../types';
import { StorageService } from '../services/storage';
import { ScannerInput } from '../components/ScannerInput';
import { ITEM_COLORS } from '../constants';
import * as XLSX from 'xlsx';

export const Inventory: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New Item State
  const [newItem, setNewItem] = useState<Partial<Item>>({
    name: '',
    quantity: 1,
    isFragile: false,
    isStackable: true,
    weight: 0
  });
  const [tempDims, setTempDims] = useState<Dimensions>({ length: 0, width: 0, height: 0 });

  useEffect(() => {
    setItems(StorageService.getItems());
  }, []);

  // Get color based on weight and fragility
  const getItemColor = (weight: number | undefined, isFragile: boolean): string => {
    if (isFragile) return "#ef4444"; // Red for fragile
    if (!weight) return "#6366f1"; // Indigo for no weight specified
    if (weight < 10) return "#10b981"; // Green for light items
    if (weight < 50) return "#f59e0b"; // Amber for medium items
    if (weight < 100) return "#f97316"; // Orange for heavy items
    return "#dc2626"; // Dark red for very heavy items
  };

  const handleAddItem = () => {
    if (!newItem.name || !tempDims.length) return alert("Name and dimensions required");
    if (!newItem.weight || newItem.weight <= 0) return alert("Weight is required and must be greater than 0");

    const itemToAdd: Item = {
      id: Date.now().toString(),
      name: newItem.name!,
      quantity: newItem.quantity || 1,
      dimensions: tempDims,
      color: getItemColor(newItem.weight, newItem.isFragile || false),
      isFragile: newItem.isFragile || false,
      isStackable: newItem.isStackable ?? true,
      weight: newItem.weight
    };

    const updated = [...items, itemToAdd];
    setItems(updated);
    StorageService.saveItems(updated);
    setShowForm(false);
    setEditingItem(null);
    setNewItem({ name: '', quantity: 1, isFragile: false, isStackable: true, weight: 0 });
    setTempDims({ length: 0, width: 0, height: 0 });
  };

  const handleEditItem = (item: Item) => {
    setEditingItem(item);
    setNewItem({
      name: item.name,
      quantity: item.quantity,
      isFragile: item.isFragile,
      isStackable: item.isStackable,
      weight: item.weight
    });
    setTempDims(item.dimensions);
    setShowForm(true);
  };

  const handleUpdateItem = () => {
    if (!editingItem) return;
    if (!newItem.name || !tempDims.length) return alert("Name and dimensions required");
    if (!newItem.weight || newItem.weight <= 0) return alert("Weight is required and must be greater than 0");

    const updatedItem: Item = {
      ...editingItem,
      name: newItem.name!,
      quantity: newItem.quantity || 1,
      dimensions: tempDims,
      color: getItemColor(newItem.weight, newItem.isFragile || false),
      isFragile: newItem.isFragile || false,
      isStackable: newItem.isStackable ?? true,
      weight: newItem.weight
    };

    const updated = items.map(i => i.id === editingItem.id ? updatedItem : i);
    setItems(updated);
    StorageService.saveItems(updated);
    setShowForm(false);
    setEditingItem(null);
    setNewItem({ name: '', quantity: 1, isFragile: false, isStackable: true, weight: 0 });
    setTempDims({ length: 0, width: 0, height: 0 });
  };

  const handleDelete = (id: string) => {
    const updated = items.filter(i => i.id !== id);
    setItems(updated);
    StorageService.saveItems(updated);
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        console.log('📊 Excel data loaded:', jsonData);

        if (jsonData.length === 0) {
          alert('❌ Excel file is empty! Please add data rows below the headers.\n\nRequired columns: name, quantity, length, width, height, weight');
          return;
        }

        // Check if first row has the required columns
        const firstRow: any = jsonData[0];
        const requiredColumns = ['name', 'quantity', 'length', 'width', 'height', 'weight'];
        const missingColumns = requiredColumns.filter(col => !(col in firstRow));

        if (missingColumns.length > 0) {
          alert(`❌ Missing required columns: ${missingColumns.join(', ')}\n\nYour columns: ${Object.keys(firstRow).join(', ')}\n\nRequired columns: name, quantity, length, width, height, weight`);
          return;
        }

        // Process the Excel data and convert to items
        const processedItems: { item: Item | null, error: string | null, rowNum: number }[] = jsonData.map((row: any, index: number) => {
          const rowNum = index + 2; // +2 because Excel is 1-indexed and has header row

          // Validate required fields
          if (!row.name || row.name.toString().trim() === '') {
            return { item: null, error: `Row ${rowNum}: Missing name`, rowNum };
          }

          const length = parseFloat(row.length);
          const width = parseFloat(row.width);
          const height = parseFloat(row.height);
          const weight = parseFloat(row.weight);

          if (isNaN(length) || length <= 0) {
            return { item: null, error: `Row ${rowNum}: Invalid length (${row.length})`, rowNum };
          }
          if (isNaN(width) || width <= 0) {
            return { item: null, error: `Row ${rowNum}: Invalid width (${row.width})`, rowNum };
          }
          if (isNaN(height) || height <= 0) {
            return { item: null, error: `Row ${rowNum}: Invalid height (${row.height})`, rowNum };
          }
          if (isNaN(weight) || weight <= 0) {
            return { item: null, error: `Row ${rowNum}: Invalid weight (${row.weight})`, rowNum };
          }

          const isFragile = row.isFragile === true || row.isFragile === 'true' || row.isFragile === 1 || row.isFragile === 'TRUE';

          const item: Item = {
            id: `excel-${Date.now()}-${index}`,
            name: row.name.toString().trim(),
            quantity: parseInt(row.quantity) || 1,
            dimensions: { length, width, height },
            color: getItemColor(weight, isFragile),
            isFragile: isFragile,
            isStackable: row.isStackable !== false && row.isStackable !== 'false' && row.isStackable !== 0 && row.isStackable !== 'FALSE',
            weight: weight
          };

          return { item, error: null, rowNum };
        });

        // Separate valid items and errors
        const validItems = processedItems.filter(p => p.item !== null).map(p => p.item!);
        const errors = processedItems.filter(p => p.error !== null);

        if (errors.length > 0) {
          const errorMsg = `⚠️ Found ${errors.length} error(s):\n\n${errors.map(e => e.error).join('\n')}\n\n${validItems.length} valid items will be imported.`;
          if (!confirm(errorMsg + '\n\nContinue with valid items?')) {
            return;
          }
        }

        if (validItems.length === 0) {
          alert('❌ No valid items found!\n\nPlease check:\n• All dimensions (length, width, height) must be > 0\n• Weight must be > 0\n• Name must not be empty\n\nExample row:\nTV Box | 2 | 120 | 80 | 60 | 25 | true | false');
          return;
        }

        // Add new items to existing items
        const updated = [...items, ...validItems];
        setItems(updated);
        StorageService.saveItems(updated);

        alert(`✅ Successfully imported ${validItems.length} items from Excel!${errors.length > 0 ? `\n\n⚠️ Skipped ${errors.length} invalid rows.` : ''}`);

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        console.error('❌ Error processing Excel file:', error);
        alert('❌ Error processing Excel file!\n\nPlease ensure:\n1. File is .xlsx or .xls format\n2. First row has headers: name, quantity, length, width, height, weight\n3. Data starts from row 2\n\nExample:\nRow 1: name | quantity | length | width | height | weight\nRow 2: TV Box | 2 | 120 | 80 | 60 | 25');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Cargo Inventory</h1>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-green-600 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors shadow-sm font-medium"
          >
            <Upload className="w-4 h-4" /> Import Manifest (Excel)
          </button>
          <button
            onClick={() => {
              setEditingItem(null);
              setNewItem({ name: '', quantity: 1, isFragile: false, isStackable: true, weight: 0 });
              setTempDims({ length: 0, width: 0, height: 0 });
              setShowForm(!showForm);
            }}
            className="bg-brand-600 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 hover:bg-brand-700 transition-colors shadow-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Add Cargo Item
          </button>
        </div>
      </div>

      {/* Color Legend */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 p-5 rounded-xl shadow-sm border border-blue-200 dark:border-gray-600 mb-6">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <Box className="w-4 h-4" />
          Color Coding Legend
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-xs text-gray-700 dark:text-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "#ef4444" }}></div>
            <span>Fragile Items</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "#10b981" }}></div>
            <span>Light (&lt;10kg)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "#f59e0b" }}></div>
            <span>Medium (10-50kg)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "#f97316" }}></div>
            <span>Heavy (50-100kg)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "#dc2626" }}></div>
            <span>Very Heavy (&gt;100kg)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "#6366f1" }}></div>
            <span>No Weight Set</span>
          </div>
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".xlsx,.xls"
        className="hidden"
      />

      {showForm && (
        <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 mb-6 animate-in fade-in slide-in-from-top-4">
          <h2 className="text-xl font-semibold mb-6 text-slate-900 dark:text-white">{editingItem ? 'Edit Item' : 'New Item Details'}</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Item Name</label>
                <input
                  type="text"
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 shadow-sm focus:ring-brand-500 focus:border-brand-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={newItem.name}
                  onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="e.g., 55 inch TV Box"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantity</label>
                  <input
                    type="number"
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={newItem.quantity}
                    onChange={e => setNewItem({ ...newItem, quantity: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={newItem.weight || ''}
                    onChange={e => setNewItem({ ...newItem, weight: parseFloat(e.target.value) })}
                    placeholder="e.g., 25.5"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={newItem.isFragile} onChange={e => setNewItem({ ...newItem, isFragile: e.target.checked })} />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Fragile</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={newItem.isStackable} onChange={e => setNewItem({ ...newItem, isStackable: e.target.checked })} />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Stackable</span>
                </label>
              </div>
            </div>

            <div>
              <ScannerInput
                label="Dimensions (L x W x H)"
                onSave={setTempDims}
                initialDims={tempDims}
              />
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
            <button
              onClick={() => {
                setShowForm(false);
                setEditingItem(null);
                setNewItem({ name: '', quantity: 1, isFragile: false, isStackable: true, weight: 0 });
                setTempDims({ length: 0, width: 0, height: 0 });
              }}
              className="px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={editingItem ? handleUpdateItem : handleAddItem}
              className="px-6 py-3 bg-slate-900 dark:bg-blue-600 text-white rounded-lg hover:bg-slate-800 dark:hover:bg-blue-700 transition-colors shadow-sm font-medium"
            >
              {editingItem ? 'Update Item' : 'Save Item'}
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {items.length === 0 ? (
          <div className="text-center py-16 px-6 text-gray-400 dark:text-gray-500 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700">
            <Box className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">Inventory Empty</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Initialize your cargo manifest manually or import via Excel.</p>
          </div>
        ) : (
          items.map(item => (
            <div key={item.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow flex justify-between items-center">
              <div className="flex items-center gap-5">
                <div
                  className="w-10 h-10 rounded flex items-center justify-center font-bold text-white"
                  style={{ backgroundColor: item.color }}
                >
                  {item.quantity}x
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">{item.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {item.dimensions.length} x {item.dimensions.width} x {item.dimensions.height} cm
                    {item.weight && <span className="ml-2 text-gray-700 font-medium">{item.weight} kg</span>}
                    {item.isFragile && <span className="ml-2 text-red-500 text-xs border border-red-200 px-1 rounded">Fragile</span>}
                    {!item.isStackable && <span className="ml-2 text-orange-500 text-xs border border-orange-200 px-1 rounded">Non-Stackable</span>}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditItem(item)}
                  className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-2.5 rounded-lg transition-colors"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 p-2.5 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
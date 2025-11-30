import React, { useState, useEffect } from 'react';
import { Truck as TruckIcon, Check, Maximize, ChevronDown } from 'lucide-react';
import { Truck, Dimensions } from '../types';
import { StorageService } from '../services/storage';
import { DEFAULT_TRUCK, TRUCK_OPTIONS } from '../constants';

export const Trucks: React.FC = () => {
    const [trucks, setTrucks] = useState<Truck[]>([]);
    const [selectedTruckId, setSelectedTruckId] = useState<string>(DEFAULT_TRUCK.id);
    const [dims, setDims] = useState<Dimensions>(DEFAULT_TRUCK.dimensions);
    const [showTruckSelector, setShowTruckSelector] = useState(false);

    useEffect(() => {
        const loadedTrucks = StorageService.getTrucks();
        setTrucks(loadedTrucks);

        // Set the first truck as selected if available
        if (loadedTrucks.length > 0) {
            setSelectedTruckId(loadedTrucks[0].id);
            setDims(loadedTrucks[0].dimensions);
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDims({ ...dims, [e.target.name]: parseFloat(e.target.value) || 0 });
    };

    const handleTruckChange = (truckId: string) => {
        const truck = TRUCK_OPTIONS.find(t => t.id === truckId) || DEFAULT_TRUCK;
        setSelectedTruckId(truckId);
        setDims(truck.dimensions);
        setShowTruckSelector(false);
    };

    const updateTruckDims = () => {
        // Find the selected truck from options or use the first one
        const truckOption = TRUCK_OPTIONS.find(t => t.id === selectedTruckId) || DEFAULT_TRUCK;

        // Update or create truck in storage
        const updatedTrucks = trucks.length > 0
            ? trucks.map(truck =>
                truck.id === selectedTruckId
                    ? { ...truck, dimensions: dims }
                    : truck
            )
            : [{ ...truckOption, dimensions: dims }];

        setTrucks(updatedTrucks);
        StorageService.saveTrucks(updatedTrucks);
        alert("Truck dimensions updated!");
    };

    const currentTruck = trucks.find(t => t.id === selectedTruckId) ||
        TRUCK_OPTIONS.find(t => t.id === selectedTruckId) ||
        DEFAULT_TRUCK;

    return (
        <div className="max-w-2xl mx-auto p-4 py-8">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <TruckIcon className="w-6 h-6" /> Fleet Configuration
            </h1>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="mb-6 relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vehicle Type</label>
                    <div
                        className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-2 text-gray-800 dark:text-white cursor-pointer flex justify-between items-center"
                        onClick={() => setShowTruckSelector(!showTruckSelector)}
                    >
                        <span>{currentTruck.name}</span>
                        <ChevronDown className={`w-5 h-5 transition-transform ${showTruckSelector ? 'rotate-180' : ''}`} />
                    </div>

                    {showTruckSelector && (
                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-lg max-h-60 overflow-y-auto">
                            {TRUCK_OPTIONS.map(truck => (
                                <div
                                    key={truck.id}
                                    className={`p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 ${selectedTruckId === truck.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
                                    onClick={() => handleTruckChange(truck.id)}
                                >
                                    <div className="font-medium text-gray-900 dark:text-white">{truck.name}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {truck.dimensions.length}×{truck.dimensions.width}×{truck.dimensions.height} cm
                                    </div>
                                    <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                                        Max Load: {truck.maxWeight} kg
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Select from standard fleet configurations</p>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 shadow-sm mb-6">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                        <Maximize className="w-5 h-5 text-brand-600 dark:text-brand-400" /> Internal Dimensions (Length x Width x Height)
                    </h3>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Length (cm)</label>
                            <input
                                type="number"
                                name="length"
                                value={dims.length}
                                onChange={handleChange}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Width (cm)</label>
                            <input
                                type="number"
                                name="width"
                                value={dims.width}
                                onChange={handleChange}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Height (cm)</label>
                            <input
                                type="number"
                                name="height"
                                value={dims.height}
                                onChange={handleChange}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 focus:ring-2 focus:ring-brand-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                    </div>

                    <button
                        onClick={updateTruckDims}
                        className="w-full flex items-center justify-center gap-2 bg-brand-600 dark:bg-brand-700 text-white py-2 rounded hover:bg-brand-700 dark:hover:bg-brand-600 transition"
                    >
                        <Check className="w-4 h-4" /> Update Fleet Specs
                    </button>
                </div>

                <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg border border-green-200 dark:border-green-700 mb-4">
                    <p className="font-bold text-green-800 dark:text-green-300 mb-1">Maximum Load Capacity</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{currentTruck.maxWeight} kg</p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-100 dark:border-blue-700 text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-bold mb-1">Dimensions Guide:</p>
                    <ul className="list-disc list-inside space-y-1">
                        <li>Length: Front to back of the container.</li>
                        <li>Width: Side to side.</li>
                        <li>Height: Floor to roof.</li>
                        <li>Ensure you account for wheel wells if not a flat floor.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};
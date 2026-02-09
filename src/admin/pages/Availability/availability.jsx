import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format, addDays, addMinutes, startOfDay, isBefore, parseISO } from 'date-fns';

const Availability = () => {
    // State
    const [viewDate, setViewDate] = useState(new Date());
    const [workDay, setWorkDay] = useState({ start: "09:00", end: "17:00" });
    const [selection, setSelection] = useState(new Set()); // Stores "yyyy-MM-dd_HH:mm" keys
    const [isDragging, setIsDragging] = useState(false);
    const [loading, setLoading] = useState(true);

    // 1. LOAD DATA ON MOUNT
    useEffect(() => {
        fetchAvailability();
    }, []);

    const fetchAvailability = async () => {
        try {
            const res = await axios.get('http://localhost:5001/api/availability');
            
            // A. Apply Settings if they exist
            if (res.data.settings) {
                setWorkDay({
                    start: res.data.settings.work_start_time.slice(0, 5), // "09:00:00" -> "09:00"
                    end: res.data.settings.work_end_time.slice(0, 5)
                });
            }

            // B. Apply Red Boxes (Convert DB timestamps to UI keys)
            if (res.data.blocks && res.data.blocks.length > 0) {
                const loadedSelection = new Set();
                res.data.blocks.forEach(block => {
                    // Extract Date and Time from UTC timestamp
                    // Note: This assumes you are storing local time or handling UTC consistent 
                    // For simplicity, we parse the ISO string
                    const dateObj = parseISO(block.start_time);
                    const dateKey = format(dateObj, 'yyyy-MM-dd');
                    const timeKey = format(dateObj, 'HH:mm');
                    loadedSelection.add(`${dateKey}_${timeKey}`);
                });
                setSelection(loadedSelection);
            }
            setLoading(false);
        } catch (error) {
            console.error("Error loading availability:", error);
            setLoading(false);
        }
    };

    // Generate time slots based on DYNAMIC settings
    const getTimeSlots = () => {
        const slots = [];
        let current = new Date(`2000-01-01T${workDay.start}:00`);
        const end = new Date(`2000-01-01T${workDay.end}:00`);
        
        // Safety check to prevent infinite loops if times are weird
        if (current >= end) return [];

        while (current < end) {
            slots.push(format(current, 'HH:mm'));
            current = addMinutes(current, 15);
        }
        return slots;
    };

    const timeSlots = getTimeSlots();
    const days = [...Array(14)].map((_, i) => addDays(viewDate, i)); // 2 weeks view

    // --- Interaction Handlers ---

    const handleMouseDown = (day, slot) => {
        if (isPastDate(day)) return; // Block interaction
        setIsDragging(true);
        toggleSlot(day, slot);
    };

    const handleMouseEnter = (day, slot) => {
        if (isDragging && !isPastDate(day)) toggleSlot(day, slot);
    };

    const toggleSlot = (day, slot) => {
        const key = `${format(day, 'yyyy-MM-dd')}_${slot}`;
        setSelection(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) {
                newSet.delete(key);
            } else {
                newSet.add(key);
            }
            return newSet;
        });
    };

    // Helper to check if a day is in the past
    const isPastDate = (day) => {
        return isBefore(day, startOfDay(new Date()));
    };

    // --- Save Logic ---

    const saveSettings = async () => {
        try {
            await axios.post('http://localhost:5001/api/availability/settings', {
                start: workDay.start,
                end: workDay.end
            });
            alert("Settings Saved! (Page will reload to redraw grid)");
            window.location.reload(); // Simple reload to re-calculate grid
        } catch (err) {
            alert("Error saving settings");
        }
    };

    const saveBlocks = async () => {
        // Convert Set to Array of Objects
        const blocksToSave = Array.from(selection).map(key => {
            const [date, time] = key.split('_');
            return {
                start_time: `${date}T${time}:00`, // ISO Format ish
                end_time: `${date}T${time}:15`,   
                is_available: false
            };
        });

        try {
            // Note: We are sending the full list of RED boxes. 
            // Ideally, the backend should clear old ones for this range and insert new ones.
            // For now, we are just upserting (adding/updating).
            await axios.post('http://localhost:5001/api/availability/blocks', { blocks: blocksToSave });
            alert("Availability Saved!");
        } catch (err) {
            console.error(err);
            alert("Error saving blocks");
        }
    };

    if (loading) return <div className="p-10">Loading schedule...</div>;

    return (
        <div className="p-6 font-sans">
            {/* Header & Settings */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-serif text-brown mb-2">Admin Availability</h1>
                    <div className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded border">
                        <span className="font-bold text-gray-600">Default Hours:</span>
                        <input 
                            type="time" 
                            value={workDay.start} 
                            onChange={(e) => setWorkDay({...workDay, start: e.target.value})}
                            className="border rounded p-1"
                        />
                        <span>to</span>
                        <input 
                            type="time" 
                            value={workDay.end} 
                            onChange={(e) => setWorkDay({...workDay, end: e.target.value})}
                            className="border rounded p-1"
                        />
                        <button onClick={saveSettings} className="text-blue-600 hover:underline ml-2">Update Hours</button>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button onClick={() => setViewDate(addDays(viewDate, -14))} className="px-3 py-2 border rounded hover:bg-gray-50">← Prev</button>
                    <button onClick={() => setViewDate(addDays(viewDate, 14))} className="px-3 py-2 border rounded hover:bg-gray-50">Next →</button>
                    <button onClick={saveBlocks} className="bg-red-600 text-white px-6 py-2 rounded shadow hover:bg-red-700">
                        Save Red Blocks
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="overflow-x-auto shadow-lg rounded-lg border border-gray-200" onMouseUp={() => setIsDragging(false)}>
                <table className="w-full border-collapse bg-white">
                    <thead>
                        <tr>
                            <th className="p-2 border bg-gray-100 sticky left-0 z-20 min-w-[100px]">Date</th>
                            {timeSlots.map(slot => (
                                <th key={slot} className="p-2 border text-xs font-medium text-gray-600 bg-gray-50 min-w-[40px]">{slot}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {days.map(day => {
                            const isPast = isPastDate(day);
                            return (
                                <tr key={day.toString()} className={isPast ? "opacity-50 bg-gray-100" : ""}>
                                    <td className="p-2 border font-medium text-sm sticky left-0 bg-white z-10 whitespace-nowrap">
                                        {format(day, 'EEE, MMM d')}
                                        {isPast && <span className="block text-xs text-gray-400">(Past)</span>}
                                    </td>
                                    {timeSlots.map(slot => {
                                        const key = `${format(day, 'yyyy-MM-dd')}_${slot}`;
                                        const isSelected = selection.has(key);
                                        
                                        return (
                                            <td
                                                key={slot}
                                                onMouseDown={() => handleMouseDown(day, slot)}
                                                onMouseEnter={() => handleMouseEnter(day, slot)}
                                                className={`
                                                    border border-gray-100 p-0 transition-all duration-75 relative
                                                    ${isPast ? 'cursor-not-allowed bg-gray-200' : 'cursor-pointer'}
                                                    ${!isPast && isSelected ? 'bg-red-500' : (!isPast ? 'bg-green-100 hover:bg-green-200' : '')}
                                                `}
                                                title={isPast ? "Cannot edit past dates" : `${format(day, 'MMM d')} ${slot}`}
                                            >
                                                {/* Optional: Add X icon if red */}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <p className="mt-4 text-sm text-gray-500">
                * Click and drag to mark times as <span className="text-red-600 font-bold">Unavailable (Red)</span>. 
                Past dates are disabled.
            </p>
        </div>
    );
};

export default Availability;
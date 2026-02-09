import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format, addDays, startOfDay, addMinutes, isSameDay } from 'date-fns';

const Availability = () => {
    const [viewDate, setViewDate] = useState(new Date());
    const [workDay, setWorkDay] = useState({ start: "09:00", end: "17:00" });
    const [unavailableBlocks, setUnavailableBlocks] = useState([]); // Loaded from DB
    const [selection, setSelection] = useState(new Set()); // Temp UI state for drag
    const [isDragging, setIsDragging] = useState(false);

    // Generate time slots based on admin start/end times
    const getTimeSlots = () => {
        const slots = [];
        let current = new Date(`2026-01-01T${workDay.start}:00`);
        const end = new Date(`2026-01-01T${workDay.end}:00`);
        while (current < end) {
            slots.push(format(current, 'HH:mm'));
            current = addMinutes(current, 15);
        }
        return slots;
    };

    const timeSlots = getTimeSlots();
    const days = [...Array(15)].map((_, i) => addDays(viewDate, i));

    const handleMouseDown = (day, slot) => {
        setIsDragging(true);
        toggleSlot(day, slot);
    };

    const handleMouseEnter = (day, slot) => {
        if (isDragging) toggleSlot(day, slot);
    };

    const toggleSlot = (day, slot) => {
        const key = `${format(day, 'yyyy-MM-dd')}_${slot}`;
        setSelection(prev => {
            const newSet = new Set(prev);
            newSet.has(key) ? newSet.delete(key) : newSet.add(key);
            return newSet;
        });
    };

    const saveChanges = async () => {
        // Transform selection set into database objects
        const blocksToSave = Array.from(selection).map(key => {
            const [date, time] = key.split('_');
            return {
                start_time: `${date}T${time}:00`,
                end_time: `${date}T${time}:15`, // Simplified 15m block
                is_available: false
            };
        });
        await axios.post('http://localhost:5001/api/availability/blocks', { blocks: blocksToSave });
        alert("Availability Updated!");
    };

    return (
        <div className="p-6 font-sans">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-serif text-brown">Admin Availability</h1>
                <div className="flex gap-4">
                    <button onClick={() => setViewDate(addDays(viewDate, -15))} className="p-2 border rounded">← Prev 15 Days</button>
                    <button onClick={() => setViewDate(addDays(viewDate, 15))} className="p-2 border rounded">Next 15 Days →</button>
                    <button onClick={saveChanges} className="bg-brown text-white px-6 py-2 rounded hover:bg-opacity-90">Save Changes</button>
                </div>
            </div>

            <div className="overflow-x-auto shadow-lg rounded-lg border border-gray-200">
                <table className="w-full border-collapse bg-white">
                    <thead>
                        <tr>
                            <th className="p-2 border bg-gray-50 sticky left-0 z-10">Date</th>
                            {timeSlots.map(slot => (
                                <th key={slot} className="p-2 border text-xs font-light bg-gray-50 whitespace-nowrap">{slot}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody onMouseUp={() => setIsDragging(false)}>
                        {days.map(day => (
                            <tr key={day.toString()}>
                                <td className="p-2 border font-medium text-sm sticky left-0 bg-white z-10 whitespace-nowrap">
                                    {format(day, 'EEE, MMM d')}
                                </td>
                                {timeSlots.map(slot => {
                                    const isSelected = selection.has(`${format(day, 'yyyy-MM-dd')}_${slot}`);
                                    return (
                                        <td
                                            key={slot}
                                            onMouseDown={() => handleMouseDown(day, slot)}
                                            onMouseEnter={() => handleMouseEnter(day, slot)}
                                            className={`border p-3 cursor-pointer transition-colors ${isSelected ? 'bg-red-500' : 'bg-green-500'} hover:opacity-75`}
                                            title={`${format(day, 'MMM d')} at ${slot}`}
                                        />
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Availability;
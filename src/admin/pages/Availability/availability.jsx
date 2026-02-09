import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format, addDays, addMinutes, startOfDay, isBefore, isSameDay, parseISO } from 'date-fns';

const Availability = () => {
    // Start viewDate at the beginning of today to prevent time mismatches
    const [viewDate, setViewDate] = useState(startOfDay(new Date()));
    const [workDay, setWorkDay] = useState({ start: "09:00", end: "17:00" });
    const [selection, setSelection] = useState(new Set()); 
    const [loading, setLoading] = useState(true);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        fetchAvailability();
    }, []);

    const fetchAvailability = async () => {
        try {
            const res = await axios.get('http://localhost:5001/api/availability');
            
            if (res.data.settings) {
                setWorkDay({
                    start: res.data.settings.work_start_time.slice(0, 5),
                    end: res.data.settings.work_end_time.slice(0, 5)
                });
            }

            if (res.data.blocks && res.data.blocks.length > 0) {
                const loadedSelection = new Set();
                res.data.blocks.forEach(block => {
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

    const getTimeSlots = () => {
        const slots = [];
        let current = new Date(`2000-01-01T${workDay.start}:00`);
        const end = new Date(`2000-01-01T${workDay.end}:00`);
        if (current >= end) return [];
        while (current < end) {
            slots.push(format(current, 'HH:mm'));
            current = addMinutes(current, 15);
        }
        return slots;
    };

    const timeSlots = getTimeSlots();
    const daysToShow = 14;
    const days = [...Array(daysToShow)].map((_, i) => addDays(viewDate, i));

    // --- Navigation Logic ---
    const handlePrev = () => {
        const today = startOfDay(new Date());
        const newDate = addDays(viewDate, -daysToShow);
        
        // Prevent going back before today
        if (isBefore(newDate, today)) {
            setViewDate(today);
        } else {
            setViewDate(newDate);
        }
    };

    const handleNext = () => {
        setViewDate(addDays(viewDate, daysToShow));
    };

    // Disable Prev button if we are already at today
    const isAtStart = isSameDay(viewDate, startOfDay(new Date()));

    // --- Interaction ---
    const handleMouseDown = (day, slot) => {
        if (isPastDate(day)) return;
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
            newSet.has(key) ? newSet.delete(key) : newSet.add(key);
            return newSet;
        });
    };

    const isPastDate = (day) => isBefore(day, startOfDay(new Date()));

    // --- Save Logic ---
    const saveChanges = async () => {
        // 1. Prepare the RED blocks
        const blocksToSave = Array.from(selection).map(key => {
            const [date, time] = key.split('_');
            return {
                start_time: `${date}T${time}:00`,
                end_time: `${date}T${time}:15`,   
                is_available: false
            };
        });

        // 2. Define the date range we are currently viewing/editing
        // The backend needs this to know which old records to delete.
        // We scan the visible days (e.g. Feb 8 to Feb 22)
        const rangeStart = format(days[0], 'yyyy-MM-dd');
        const rangeEnd = format(days[days.length - 1], 'yyyy-MM-dd');

        try {
            await axios.post('http://localhost:5001/api/availability/blocks', { 
                blocks: blocksToSave,
                rangeStart: `${rangeStart}T00:00:00`,
                rangeEnd: `${rangeEnd}T23:59:59`
            });
            alert("Schedule saved successfully!");
        } catch (err) {
            console.error(err);
            alert("Error saving schedule");
        }
    };

    const saveSettings = async () => {
        try {
            await axios.post('http://localhost:5001/api/availability/settings', {
                start: workDay.start,
                end: workDay.end
            });
            window.location.reload(); 
        } catch (err) {
            alert("Error saving settings");
        }
    };

    if (loading) return <div className="p-10">Loading...</div>;

    return (
        <div className="p-6 font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-serif text-brown mb-2">Admin Availability</h1>
                    <div className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded border">
                        <span className="font-bold text-gray-600">Hours:</span>
                        <input type="time" value={workDay.start} onChange={(e) => setWorkDay({...workDay, start: e.target.value})} className="border rounded p-1"/>
                        <span>-</span>
                        <input type="time" value={workDay.end} onChange={(e) => setWorkDay({...workDay, end: e.target.value})} className="border rounded p-1"/>
                        <button onClick={saveSettings} className="text-blue-600 hover:underline ml-2">Set Default</button>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button 
                        onClick={handlePrev} 
                        disabled={isAtStart}
                        className={`px-3 py-2 border rounded ${isAtStart ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                    >
                        ← Prev
                    </button>
                    <button onClick={handleNext} className="px-3 py-2 border rounded hover:bg-gray-50">Next →</button>
                    <button onClick={saveChanges} className="bg-brown text-white px-6 py-2 rounded shadow hover:bg-opacity-90">
                        Save Changes
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
                                                    border border-gray-200 p-0 transition-all duration-75 relative
                                                    ${isPast ? 'cursor-not-allowed bg-gray-200' : 'cursor-pointer'}
                                                    ${
                                                        !isPast && isSelected 
                                                            ? 'bg-red-500' // Red for Unavailable
                                                            : (!isPast ? 'bg-emerald-500 hover:bg-emerald-600' : '') // Darker Green for Available
                                                    }
                                                `}
                                                title={isSelected ? "Unavailable" : "Available"}
                                            />
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            
            <div className="mt-4 flex gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-emerald-500 border"></div>
                    <span>Available</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500 border"></div>
                    <span>Unavailable (Drag to select)</span>
                </div>
            </div>
        </div>
    );
};

export default Availability;
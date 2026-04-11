import React, { useState } from 'react';

const SubtractBalanceModal = ({ isOpen, onClose, currentBalance, onConfirm, onRefresh }) => {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }
    if (numericAmount > currentBalance) {
      setError('Cannot subtract more than the remaining balance.');
      return;
    }

    if (!paymentMethod) {
      setError('Please enter a payment method.');
      return;
    }

    if(!window.confirm(`Are you sure you want to subtract $${numericAmount.toFixed(2)} from the balance? This action cannot be undone.`)) return;

    onConfirm(numericAmount, paymentMethod);
    setPaymentMethod('');
    setAmount('');
    setError('');
    onClose();
    onRefresh(); 
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-lg">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-gray-800">Adjust Balance</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-2">
              Current Owed Balance: <span className="font-bold text-gray-900">${currentBalance.toFixed(2)}</span>
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount to Subtract
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-400">$</span>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                autoFocus
              />
            </div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method (e.g., Debit, Credit, Cash, Zelle, etc.)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-400"></span>
              <input
                type="text"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                placeholder="enter payment method"
                className="w-full pl-7 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          
              />
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>

          <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-md mb-6">
            New balance will be: <strong>${(currentBalance - (parseFloat(amount) || 0)).toFixed(2)}</strong>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shadow-sm"
            >
              Apply Reduction
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubtractBalanceModal;
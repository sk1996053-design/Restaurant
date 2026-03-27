import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Receipt, Download, Printer, Search, Calendar } from "lucide-react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { Order } from "../types";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import Toast, { ToastType } from "../components/Toast";
import { handleFirestoreError, OperationType } from "../lib/utils";

export default function Billing() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      setOrders(ordersData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "orders");
      showToast("Failed to sync orders", "error");
    });

    return () => unsubscribe();
  }, []);

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || o.id.includes(searchQuery);
    const matchesDate = !dateFilter || new Date(o.createdAt).toLocaleDateString() === new Date(dateFilter).toLocaleDateString();
    return matchesSearch && matchesDate;
  });

  const generatePDF = (order: Order) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.text("LuxeBite Restaurant", 105, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.text(`Invoice ID: #${order.id.slice(-6)}`, 20, 40);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleString()}`, 20, 45);
    doc.text(`Customer: ${order.customerName}`, 20, 50);
    
    // Table
    const tableData = order.items.map(item => [
      item.name,
      item.quantity.toString(),
      `₹${item.price.toLocaleString('en-IN')}`,
      `₹${(item.price * item.quantity).toLocaleString('en-IN')}`
    ]);

    autoTable(doc, {
      startY: 60,
      head: [["Item", "Qty", "Price", "Total"]],
      body: tableData,
      foot: [["", "", "Grand Total", `₹${order.total.toLocaleString('en-IN')}`]],
      theme: "striped",
      headStyles: { fillColor: [124, 58, 237] },
    });

    // Footer
    doc.setFontSize(10);
    doc.text("Thank you for dining with us!", 105, doc.internal.pageSize.height - 20, { align: "center" });

    doc.save(`LuxeBite_Bill_${order.id.slice(-6)}.pdf`);
    showToast("PDF generated successfully!", "success");
  };

  const handlePrint = (order: Order) => {
    // In a real app, this would open a print-friendly window
    // For now, we'll just trigger the PDF download as it's the most reliable "print" option
    generatePDF(order);
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Billing System</h1>
          <p className="text-gray-400">Generate and manage customer invoices</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by customer or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full glass-input pl-12"
          />
        </div>
        <div className="relative w-full md:w-64">
          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full glass-input pl-12"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredOrders.reverse().map((order) => (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-6 flex flex-col md:flex-row justify-between items-center gap-6"
          >
            <div className="flex items-center gap-6 w-full md:w-auto">
              <div className="w-12 h-12 rounded-xl bg-purple-600/20 flex items-center justify-center text-purple-400">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-purple-400">#{order.id.slice(-6)}</span>
                  <span className="text-xs text-gray-500">•</span>
                  <span className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</span>
                </div>
                <h3 className="text-lg font-bold">{order.customerName}</h3>
                <p className="text-sm text-gray-400">{order.items.length} items • ₹{order.total.toLocaleString('en-IN')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => handlePrint(order)}
                className="flex-1 md:flex-none glass-button flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
              <button
                onClick={() => generatePDF(order)}
                className="flex-1 md:flex-none glass-button bg-purple-600 hover:bg-purple-500 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                PDF
              </button>
            </div>
          </motion.div>
        ))}
        {filteredOrders.length === 0 && (
          <div className="glass-card p-12 text-center text-gray-500">
            No orders found matching your criteria.
          </div>
        )}
      </div>

      <AnimatePresence>
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

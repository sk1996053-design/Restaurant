import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Search, Trash2, ShoppingCart, X, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, Timestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import { Order, OrderItem, MENU_ITEMS } from "../types";
import { cn, handleFirestoreError, OperationType } from "../lib/utils";
import Toast, { ToastType } from "../components/Toast";

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  
  // New Order State
  const [customerName, setCustomerName] = useState("");
  const [selectedItems, setSelectedItems] = useState<OrderItem[]>([]);
  const [category, setCategory] = useState("All");

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const categories = ["All", ...Array.from(new Set(MENU_ITEMS.map(i => i.category)))];

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      setOrders(ordersData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "orders");
      showToast("Failed to sync orders", "error");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddItem = (item: any) => {
    const existing = selectedItems.find(i => i.id === item.id);
    if (existing) {
      setSelectedItems(selectedItems.map(i => 
        i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      setSelectedItems([...selectedItems, { ...item, quantity: 1 }]);
    }
  };

  const handleRemoveItem = (id: string) => {
    setSelectedItems(selectedItems.filter(i => i.id !== id));
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    setSelectedItems(selectedItems.map(i => {
      if (i.id === id) {
        const newQty = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }));
  };

  const handleSubmitOrder = async () => {
    if (!customerName || selectedItems.length === 0 || !auth.currentUser) return;

    const total = selectedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const newOrder = {
      customerName,
      items: selectedItems,
      total,
      status: 'pending',
      createdAt: new Date().toISOString(),
      createdBy: auth.currentUser.uid
    };

    try {
      await addDoc(collection(db, "orders"), newOrder);
      setIsModalOpen(false);
      setCustomerName("");
      setSelectedItems([]);
      showToast("Order placed successfully!", "success");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "orders");
      showToast("Failed to place order", "error");
    }
  };

  const handleDeleteOrder = async (id: string) => {
    try {
      await deleteDoc(doc(db, "orders", id));
      showToast("Order deleted", "info");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `orders/${id}`);
      showToast("Failed to delete order", "error");
    }
  };

  const filteredOrders = orders.filter(o => 
    o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.id.includes(searchQuery)
  );

  const filteredMenu = category === "All" 
    ? MENU_ITEMS 
    : MENU_ITEMS.filter(i => i.category === category);

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Order Management</h1>
          <p className="text-gray-400">Create and manage customer orders</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="glass-button bg-purple-600 hover:bg-purple-500 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Order
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
        <input
          type="text"
          placeholder="Search by customer name or order ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full glass-input pl-12 py-3"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredOrders.reverse().map((order) => (
            <motion.div
              key={order.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass-card p-6 space-y-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-mono text-purple-400 mb-1">#{order.id.slice(-6)}</p>
                  <h3 className="text-xl font-bold">{order.customerName}</h3>
                </div>
                <button 
                  onClick={() => handleDeleteOrder(order.id)}
                  className="p-2 hover:bg-red-500/10 text-red-400 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-400">{item.quantity}x {item.name}</span>
                    <span className="font-medium">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-glass-border flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-500">Total Amount</p>
                  <p className="text-xl font-bold text-purple-400">₹{order.total.toLocaleString('en-IN')}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  order.status === 'completed' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
                }`}>
                  {order.status}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* New Order Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl glass-card max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-glass-border flex justify-between items-center">
                <h2 className="text-2xl font-bold">New Order</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-glass-hover rounded-lg">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                {/* Menu Selection */}
                <div className="flex-1 p-6 overflow-y-auto border-b md:border-b-0 md:border-r border-glass-border space-y-6">
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={cn(
                          "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                          category === cat ? "bg-purple-600 text-white" : "bg-glass text-gray-400 hover:text-white"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredMenu.map(item => (
                      <button
                        key={item.id}
                        onClick={() => handleAddItem(item)}
                        className="glass p-4 rounded-xl text-left hover:bg-glass-hover transition-all group"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs text-purple-400 font-medium">{item.category}</span>
                          <Plus className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <h4 className="font-bold mb-1">{item.name}</h4>
                        <p className="text-lg font-bold text-white/90">₹{item.price.toLocaleString('en-IN')}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Order Summary */}
                <div className="w-full md:w-80 p-6 bg-glass/20 flex flex-col gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Customer Name</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full glass-input"
                      placeholder="Enter name..."
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-4">
                    <h3 className="font-bold flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4" />
                      Cart ({selectedItems.length})
                    </h3>
                    {selectedItems.map(item => (
                      <div key={item.id} className="glass p-3 rounded-lg space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="text-sm font-medium">{item.name}</span>
                          <button onClick={() => handleRemoveItem(item.id)} className="text-red-400 hover:text-red-300">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleUpdateQuantity(item.id, -1)}
                              className="p-1 glass rounded hover:bg-glass-hover"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-sm font-mono w-4 text-center">{item.quantity}</span>
                            <button 
                              onClick={() => handleUpdateQuantity(item.id, 1)}
                              className="p-1 glass rounded hover:bg-glass-hover"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                          <span className="font-bold text-sm">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    ))}
                    {selectedItems.length === 0 && (
                      <p className="text-center text-gray-500 py-8 text-sm">Cart is empty</p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-glass-border space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Total</span>
                      <span className="text-2xl font-bold text-purple-400">
                        ₹{selectedItems.reduce((sum, i) => sum + i.price * i.quantity, 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <button
                      onClick={handleSubmitOrder}
                      disabled={!customerName || selectedItems.length === 0}
                      className="w-full glass-button bg-purple-600 hover:bg-purple-500 py-3"
                    >
                      Place Order
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

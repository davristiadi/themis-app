import * as React from 'react';
import { Plus, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

// Type definitions
interface Participant {
  id: string;
  name: string;
}

interface Transaction {
  id: string;
  title: string;
  amount: string;
  payer: string;
  contributions: Record<string, string>;
  isSplitBill: boolean;
}


// Helper function to format IDR
const formatIDR = (amount) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
};

const App = () => {
  const [participants, setParticipants] = React.useState<Participant[]>(() => {
    const storedParticipants = localStorage.getItem('participants');
    return storedParticipants ? JSON.parse(storedParticipants) : [];
  });
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [newParticipant, setNewParticipant] = React.useState<string>('');
  const [currentTransaction, setCurrentTransaction] = React.useState<Transaction>({
    id: '',
    title: '',
    amount: '',
    payer: '',
    contributions: {},
    isSplitBill: false
  });
  const [editingTransactionId, setEditingTransactionId] = React.useState<string | null>(null);

  const addParticipant = () => {
    if (newParticipant.trim() !== '') {
      const newParticipantObj = { name: newParticipant.trim(), id: Date.now().toString() };
      setParticipants(prev => [...prev, newParticipantObj]);
      setNewParticipant('');
      
      setCurrentTransaction(prev => ({
        ...prev,
        contributions: {
          ...prev.contributions,
          [newParticipantObj.id]: prev.isSplitBill ? (parseFloat(prev.amount) / (participants.length + 1)).toFixed(2) : ''
        }
      }));
    }
  };

  const removeParticipant = (id: string): void => {
    setParticipants(prev => prev.filter(p => p.id !== id));
    setCurrentTransaction((prev: Transaction) => {
      const { [id]: removed, ...restContributions } = prev.contributions;
      const updatedTransaction: Transaction = {
        ...prev,
        contributions: restContributions,
      };
      
      if (prev.isSplitBill) {
        updatedTransaction.contributions = recalculateSplitBill(prev.amount);
      }
      
      return updatedTransaction;
    });
  };

  const recalculateSplitBill = (amount: string): Record<string, string> => {
    const participantCount = participants.length;
    if (participantCount === 0) return {};
    const splitAmount = (parseFloat(amount) / participantCount).toFixed(2);
    return Object.fromEntries(participants.map(p => [p.id, splitAmount]));
  };

  const updateCurrentTransaction = (field, value) => {
    setCurrentTransaction(prev => {
      const updatedTransaction = { ...prev, [field]: value };
      if (field === 'amount' && prev.isSplitBill) {
        updatedTransaction.contributions = recalculateSplitBill(value);
      }
      return updatedTransaction;
    });
  };

  const updateContribution = (participantId, value) => {
    setCurrentTransaction(prev => ({
      ...prev,
      contributions: { ...prev.contributions, [participantId]: value }
    }));
  };

  const toggleSplitBill = () => {
    setCurrentTransaction(prev => {
      const isSplitBill = !prev.isSplitBill;
      let contributions = prev.contributions;
      if (isSplitBill) {
        contributions = recalculateSplitBill(prev.amount);
      }
      return { ...prev, isSplitBill, contributions };
    });
  };

  const submitTransaction = () => {
    if (editingTransactionId) {
      setTransactions(prev => prev.map(t => 
        t.id === editingTransactionId ? { ...currentTransaction, id: editingTransactionId } : t
      ));
      setEditingTransactionId(null);
    } else {
      setTransactions(prev => [...prev, { ...currentTransaction, id: Date.now().toString() }]);
    }
    setCurrentTransaction({
      id: '',
      title: '',
      amount: '',
      payer: '',
      contributions: Object.fromEntries(participants.map(p => [p.id, ''])),
      isSplitBill: false
    });
  };

  const editTransaction = (id) => {
    const transactionToEdit = transactions.find(t => t.id === id);
    setCurrentTransaction(transactionToEdit);
    setEditingTransactionId(id);
  };

  const deleteTransaction = (id) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const calculateSummary = () => {
    const summary = Object.fromEntries(participants.map(p => [p.id, 0]));

    transactions.forEach(t => {
      if (t.payer) {
        summary[t.payer] += parseFloat(t.amount) || 0;
      }
      Object.entries(t.contributions).forEach(([id, amount]) => {
        summary[id] -= parseFloat(amount) || 0;
      });
    });

    return summary;
  };

  const validateContributions = (transaction: Transaction): string => {
    const totalAmount = parseFloat(transaction.amount) || 0;
    const totalContributions = Object.values(transaction.contributions).reduce((sum, value) => {
      const contributionAmount = parseFloat(value);
      return sum + (isNaN(contributionAmount) ? 0 : contributionAmount);
    }, 0);
    
    if (totalContributions > totalAmount) {
      return "Total contributions exceed the transaction amount.";
    } else if (totalContributions < totalAmount) {
      return "Total contributions are less than the transaction amount.";
    }
    return "";
  };

  React.useEffect(() => {
    localStorage.setItem('participants', JSON.stringify(participants));
  }, [participants]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-6">Bill Splitter App</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl">Participants</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2 mb-4">
            <Input
              type="text"
              value={newParticipant}
              onChange={(e) => setNewParticipant(e.target.value)}
              placeholder="Enter participant name"
              className="flex-grow"
            />
            <Button variant="default" onClick={addParticipant}>
              <Plus className="mr-2 h-16 w-4 " /> Add
            </Button>
          </div>
          <ul className="space-y-2">
            {participants.map(p => (
              <li key={p.id} className="flex justify-between items-center bg-gray-100 p-2 rounded">
                <span>{p.name}</span>
                <Button variant="ghost" size="icon" onClick={() => removeParticipant(p.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl">New Transaction</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={currentTransaction.title}
                onChange={(e) => updateCurrentTransaction('title', e.target.value)}
                placeholder="Transaction title"
              />
            </div>
            <div>
              <Label htmlFor="amount">Amount (IDR)</Label>
              <Input
                id="amount"
                type="number"
                value={currentTransaction.amount}
                onChange={(e) => updateCurrentTransaction('amount', e.target.value)}
                placeholder="Amount"
              />
            </div>
          </div>
          <div className="mb-4">
            <Label htmlFor="payer">Payer</Label>
            <Select
              value={currentTransaction.payer}
              onValueChange={(value) => updateCurrentTransaction('payer', value)}
            >
              <SelectTrigger id="payer">
                <SelectValue placeholder="Select payer" />
              </SelectTrigger>
              <SelectContent>
                {participants.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2 mb-4">
            <Checkbox
              id="split-bill"
              checked={currentTransaction.isSplitBill}
              onCheckedChange={toggleSplitBill}
            />
            <Label htmlFor="split-bill">Split bill equally</Label>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Contributions</h3>
            {participants.map(p => (
              <div key={p.id} className="flex items-center space-x-2 mb-2">
                <Label htmlFor={`contribution-${p.id}`} className="w-1/3 text-sm">{p.name}</Label>
                <Input
                  id={`contribution-${p.id}`}
                  type="number"
                  value={currentTransaction.contributions[p.id]}
                  onChange={(e) => updateContribution(p.id, e.target.value)}
                  placeholder="Contribution amount"
                  className="w-2/3"
                  disabled={currentTransaction.isSplitBill}
                />
              </div>
            ))}
          </div>
          {validateContributions(currentTransaction) && (
            <p className="text-red-500 mt-2">{validateContributions(currentTransaction)}</p>
          )}
          <Button 
            onClick={submitTransaction}
            className="mt-4"
          >
            {editingTransactionId ? 'Update' : 'Submit'} Transaction
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <h3 className="text-xl font-semibold mb-2">Balance</h3>
          <ul className="space-y-2 mb-6">
            {Object.entries(calculateSummary()).map(([id, amount]) => {
              const participant = participants.find(p => p.id === id);
              if (!participant) return null;
              return (
                <li key={id} className="flex justify-between items-center bg-gray-100 p-2 rounded">
                  <span>{participant.name}</span>
                  <span className={amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatIDR(amount)}
                  </span>
                </li>
              );
            })}
          </ul>
          <h3 className="text-xl font-semibold mb-2">All Transactions</h3>
          <div className="grid grid-cols-2 gap-4">
            <ul className="space-y-2">
              {transactions.map(t => (
                <li key={t.id} className="bg-gray-100 p-4 rounded">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">{t.title || 'Untitled'}</span>
                    <span>{formatIDR(parseFloat(t.amount) || 0)}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Payer: {participants.find(p => p.id === t.payer)?.name || 'Not specified'}
                  </div>
                  <div className="text-sm">
                    {t.isSplitBill ? 'Split equally' : 'Custom split'}
                  </div>
                  <div className="mt-2 flex justify-end space-x-2">
                    <Button size="sm" onClick={() => editTransaction(t.id)}>
                      <Edit className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteTransaction(t.id)}>
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default App;
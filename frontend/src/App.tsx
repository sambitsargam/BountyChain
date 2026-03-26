import { useState } from 'react';
import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction } from '@onelabs/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import './App.css';

const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID;

function App() {
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  
  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    category: '',
    reward: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const createTask = async () => {
    if (!taskData.title || !taskData.reward) {
      setMessage('Please fill in required fields');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const tx = new Transaction();
      const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(parseInt(taskData.reward))]);
      
      tx.moveCall({
        target: `${PACKAGE_ID}::task_platform::create_task`,
        arguments: [
          tx.pure.string(taskData.title),
          tx.pure.string(taskData.description),
          tx.pure.string(taskData.category),
          coin,
        ],
      });

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: (result) => {
            console.log('Task created:', result);
            setMessage('✅ Task created successfully!');
            setTaskData({ title: '', description: '', category: '', reward: '' });
          },
          onError: (error) => {
            console.error('Error:', error);
            setMessage('❌ Error creating task');
          },
        }
      );
    } catch (error) {
      console.error('Transaction error:', error);
      setMessage('❌ Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bounty-app">
      <div className="grid-bg">
        <div className="grid-lines"></div>
      </div>

      <header className="bounty-header">
        <div className="bounty-brand">
          <span className="bounty-icon">🧩</span>
          <span className="bounty-title">BountyChain</span>
        </div>
        <ConnectButton />
      </header>

      <main className="bounty-main">
        <div className="bounty-hero">
          <h1>Decentralized <span className="glow-text">Task & Bounty</span> Platform</h1>
          <p>Connect creators with contributors through AI-powered task matching</p>
        </div>

        {account ? (
          <div className="bounty-content">
            <div className="task-card">
              <div className="card-header">
                <h2>Post a Bounty Task</h2>
                <p>Create tasks and reward contributors with ONE tokens</p>
              </div>
              
              <div className="task-form">
                <div className="form-row">
                  <input
                    type="text"
                    placeholder="Task Title *"
                    value={taskData.title}
                    onChange={(e) => setTaskData({ ...taskData, title: e.target.value })}
                    disabled={loading}
                  />
                  <input
                    type="text"
                    placeholder="Category (e.g., Development)"
                    value={taskData.category}
                    onChange={(e) => setTaskData({ ...taskData, category: e.target.value })}
                    disabled={loading}
                  />
                </div>
                
                <textarea
                  placeholder="Task Description"
                  value={taskData.description}
                  onChange={(e) => setTaskData({ ...taskData, description: e.target.value })}
                  disabled={loading}
                  rows={4}
                />
                
                <input
                  type="number"
                  placeholder="Reward Amount (in ONE) *"
                  value={taskData.reward}
                  onChange={(e) => setTaskData({ ...taskData, reward: e.target.value })}
                  disabled={loading}
                />
                
                <button onClick={createTask} disabled={loading} className="bounty-btn">
                  {loading ? 'Creating Task...' : 'Create Bounty Task'}
                </button>
                
                {message && <div className={`bounty-msg ${message.includes('✅') ? 'success' : 'error'}`}>{message}</div>}
              </div>
            </div>

            <div className="bounty-features">
              <div className="bounty-feature">
                <div className="feat-icon">🎯</div>
                <h3>AI Matching</h3>
                <p>Smart recommendations match tasks with skilled contributors</p>
              </div>
              <div className="bounty-feature">
                <div className="feat-icon">⚡</div>
                <h3>Instant Rewards</h3>
                <p>Automated payments upon task completion</p>
              </div>
              <div className="bounty-feature">
                <div className="feat-icon">🔍</div>
                <h3>Quality Validation</h3>
                <p>AI-powered submission evaluation and ranking</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bounty-connect">
            <div className="connect-panel">
              <div className="panel-icon">🔐</div>
              <h2>Connect Your Wallet</h2>
              <p>Start posting tasks or earning bounties on OneChain</p>
            </div>
          </div>
        )}
      </main>

      <footer className="bounty-footer">
        <p>BountyChain • Empowering Decentralized Work</p>
      </footer>
    </div>
  );
}

export default App;

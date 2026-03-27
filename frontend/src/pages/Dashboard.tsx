import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction, useSuiClientQuery, useSuiClient } from '@onelabs/dapp-kit';
import { Transaction } from '@onelabs/sui/transactions';
import { motion, AnimatePresence } from 'framer-motion';

const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID;

function Dashboard() {
  const navigate = useNavigate();
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const [activeTab, setActiveTab] = useState<'post' | 'submit' | 'my-tasks' | 'my-submissions'>('post');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [aiScore, setAiScore] = useState<number | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [aiChecking, setAiChecking] = useState(false);
  const [taskData, setTaskData] = useState({ title: '', description: '', category: '', reward: '' });
  const [submitData, setSubmitData] = useState({ taskId: '', proofUrl: '', description: '' });
  const [selectedTask, setSelectedTask] = useState<any>(null);
  // submission details cache: submission_id -> { proofUrl, description }
  const [subDetails, setSubDetails] = useState<Record<string, { proofUrl: string; description: string }>>({});

  const { data: taskEvents, refetch: refetchTasks } = useSuiClientQuery('queryEvents', {
    query: { MoveEventType: `${PACKAGE_ID}::task_platform::TaskCreated` }, limit: 50,
  }, { refetchInterval: 3000 });

  const { data: submissionEvents, refetch: refetchSubmissions } = useSuiClientQuery('queryEvents', {
    query: { MoveEventType: `${PACKAGE_ID}::task_platform::SubmissionMade` }, limit: 200,
  }, { refetchInterval: 3000 });

  const allTasks = taskEvents?.data || [];
  const allSubmissions = submissionEvents?.data || [];
  const myTasks = allTasks.filter((e: any) => e.parsedJson?.creator === account?.address);
  // Submissions I made
  const mySubmissions = allSubmissions.filter((s: any) => s.parsedJson?.submitter === account?.address);

  const getSubmissionCount = (taskId: string) =>
    allSubmissions.filter((s: any) => s.parsedJson?.task_id === taskId).length;

  // Get all submissions for a specific task (for task creator view)
  const getTaskSubmissions = (taskId: string) =>
    allSubmissions.filter((s: any) => s.parsedJson?.task_id === taskId);

  // Find task title by task_id
  const getTaskTitle = (taskId: string) => {
    const task = allTasks.find((t: any) => t.parsedJson?.task_id === taskId) as any;
    return task?.parsedJson?.title || 'Unknown Task';
  };

  const getTaskReward = (taskId: string) => {
    const task = allTasks.find((t: any) => t.parsedJson?.task_id === taskId) as any;
    return task?.parsedJson?.reward_amount || 0;
  };

  // Fetch submission object details (proof_url, description) from chain
  const fetchSubDetails = async (submissionId: string) => {
    if (subDetails[submissionId]) return; // already cached
    try {
      const obj = await suiClient.getObject({
        id: submissionId,
        options: { showContent: true },
      });
      const fields = (obj.data?.content as any)?.fields;
      if (fields) {
        setSubDetails(prev => ({
          ...prev,
          [submissionId]: {
            proofUrl: fields.proof_url || '',
            description: fields.description || '',
          },
        }));
      }
    } catch { /* object may not be accessible */ }
  };

  // AI quality check for task description
  const checkTaskWithAI = async () => {
    if (!taskData.title || !taskData.description) { setMessage('Fill in title and description first'); return; }
    setAiChecking(true); setAiScore(null); setAiAnalysis(''); setMessage('');
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [{ role: 'user', content: `You are a bounty platform AI. Analyze this task for clarity, legitimacy, and fairness. Return ONLY JSON: {"score": integer 0-100, "reason": "one sentence"}. Task Title: "${taskData.title}", Description: "${taskData.description}", Category: "${taskData.category}", Reward: ${taskData.reward} OTC` }],
          max_tokens: 150,
        }),
      });
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '{}';
      const parsed = JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] || '{}');
      setAiScore(parseInt(parsed.score) || 0);
      setAiAnalysis(parsed.reason || '');
    } catch { setAiScore(50); setAiAnalysis('AI analysis unavailable.'); }
    finally { setAiChecking(false); }
  };

  const postTask = async () => {
    if (aiScore === null) { setMessage('Run AI verification first'); return; }
    if (aiScore < 75) { setMessage(`❌ AI score ${aiScore}/100 — below 75. Task blocked.`); return; }
    if (!taskData.title || !taskData.reward) { setMessage('Fill all required fields'); return; }
    setLoading(true); setMessage('Posting task on-chain...');
    try {
      const tx = new Transaction();
      const rewardAmount = Math.floor(parseFloat(taskData.reward) * 1_000_000_000);
      const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(rewardAmount)]);
      tx.moveCall({
        target: `${PACKAGE_ID}::task_platform::create_task`,
        arguments: [tx.pure.string(taskData.title), tx.pure.string(taskData.description), tx.pure.string(taskData.category || 'General'), coin],
      });
      signAndExecute({ transaction: tx }, {
        onSuccess: () => { setMessage('✅ Bounty posted!'); setTaskData({ title: '', description: '', category: '', reward: '' }); setAiScore(null); setAiAnalysis(''); refetchTasks(); },
        onError: () => setMessage('❌ Failed to post task'),
      });
    } catch { setMessage('❌ Transaction failed'); }
    finally { setLoading(false); }
  };

  const submitWork = async () => {
    if (!submitData.taskId || !submitData.proofUrl) { setMessage('Task ID and proof URL are required'); return; }
    setLoading(true); setMessage('Submitting work on-chain...');
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::task_platform::submit_work`,
        arguments: [tx.object(submitData.taskId), tx.pure.string(submitData.proofUrl), tx.pure.string(submitData.description || 'Work submission')],
      });
      signAndExecute({ transaction: tx }, {
        onSuccess: () => { setMessage('✅ Work submitted!'); setSubmitData({ taskId: '', proofUrl: '', description: '' }); setSelectedTask(null); refetchSubmissions(); },
        onError: () => setMessage('❌ Submission failed'),
      });
    } catch { setMessage('❌ Transaction failed'); }
    finally { setLoading(false); }
  };

  const scoreColor = aiScore === null ? '' : aiScore >= 75 ? 'text-amber-400' : aiScore >= 50 ? 'text-yellow-400' : 'text-red-400';
  const scoreBg = aiScore === null ? '' : aiScore >= 75 ? 'bg-amber-500/10 border-amber-500/30' : aiScore >= 50 ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-red-500/10 border-red-500/30';

  if (!account) return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center glass rounded-3xl p-12">
        <div className="text-6xl mb-4">🧩</div>
        <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
        <p className="text-gray-400 mb-6">Connect to post bounties or submit work</p>
        <ConnectButton />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="fixed top-0 left-0 right-0 z-[100] glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <motion.div className="flex items-center gap-2 cursor-pointer" whileHover={{ scale: 1.05 }} onClick={() => navigate('/')}>
            <span className="text-2xl">🧩</span>
            <span className="text-lg font-bold text-gradient-bounty">BountyChain</span>
          </motion.div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/explore')} className="text-sm text-gray-300 hover:text-white transition-colors">Explore</button>
            <ConnectButton />
          </div>
        </div>
      </nav>

      <div className="pt-24 px-6 pb-12 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold mb-1">Bounty Dashboard</h1>
          <p className="text-gray-400 text-sm font-mono">{account.address.slice(0, 24)}...</p>
        </motion.div>

        <div className="flex flex-wrap gap-2 mb-8 glass rounded-xl p-1 w-fit">
          {(['post', 'submit', 'my-tasks', 'my-submissions'] as const).map((tab) => (
            <button key={tab} onClick={() => { setActiveTab(tab); setMessage(''); setAiScore(null); setAiAnalysis(''); }}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all capitalize ${activeTab === tab ? 'bg-gradient-to-r from-amber-500 to-red-500 text-white' : 'text-gray-400 hover:text-white'}`}>
              {tab.replace(/-/g, ' ')}
            </button>
          ))}
        </div>

        {/* POST BOUNTY */}
        {activeTab === 'post' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-8 max-w-2xl">
            <h2 className="text-2xl font-bold mb-2">Post a Bounty</h2>
            <p className="text-sm text-gray-400 mb-6">AI must score your task ≥ 75/100 before it goes live.</p>
            <AnimatePresence>
              {aiScore !== null && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`mb-6 p-4 rounded-xl border ${scoreBg}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold">🤖 AI Task Quality Score</span>
                    <span className={`text-2xl font-bold ${scoreColor}`}>{aiScore}/100</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 mb-2">
                    <div className={`h-2 rounded-full transition-all duration-700 ${aiScore >= 75 ? 'bg-amber-500' : aiScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${aiScore}%` }} />
                  </div>
                  <p className={`text-xs ${scoreColor}`}>{aiAnalysis}</p>
                  <p className={`text-xs mt-1 font-semibold ${aiScore >= 75 ? 'text-amber-400' : 'text-red-400'}`}>
                    {aiScore >= 75 ? '✅ Passed — task can go live' : '❌ Failed — improve task description and retry'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex flex-col gap-4">
              <input className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
                placeholder="Task Title *" value={taskData.title} onChange={(e) => { setTaskData({ ...taskData, title: e.target.value }); setAiScore(null); }} disabled={loading} />
              <textarea className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors resize-none"
                placeholder="Detailed task description *" rows={4} value={taskData.description} onChange={(e) => { setTaskData({ ...taskData, description: e.target.value }); setAiScore(null); }} disabled={loading} />
              <input className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
                placeholder="Category (e.g. Development, Design, Writing)" value={taskData.category} onChange={(e) => setTaskData({ ...taskData, category: e.target.value })} disabled={loading} />
              <input className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
                placeholder="Reward Amount (OTC) *" type="number" value={taskData.reward} onChange={(e) => { setTaskData({ ...taskData, reward: e.target.value }); setAiScore(null); }} disabled={loading} />
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={checkTaskWithAI} disabled={aiChecking || loading}
                className="py-3 glass border border-amber-500/40 rounded-xl font-semibold text-amber-400 hover:bg-amber-500/10 transition-all disabled:opacity-50">
                {aiChecking ? '🤖 Analyzing...' : '🤖 Step 1: Run AI Verification'}
              </motion.button>
              <motion.button whileHover={{ scale: aiScore !== null && aiScore >= 75 ? 1.02 : 1 }} whileTap={{ scale: 0.98 }} onClick={postTask}
                disabled={loading || aiScore === null || aiScore < 75}
                className="py-4 bg-gradient-to-r from-amber-500 to-red-500 rounded-xl font-bold text-lg disabled:opacity-30 disabled:cursor-not-allowed">
                {loading ? '⏳ Posting...' : aiScore === null ? '🔒 Step 2: Post Bounty (verify first)' : aiScore < 75 ? `🔒 Blocked — Score ${aiScore}/100 < 75` : '🎯 Step 2: Post Bounty'}
              </motion.button>
              {message && <div className={`p-3 rounded-xl text-sm text-center ${message.includes('✅') ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-300'}`}>{message}</div>}
            </div>
          </motion.div>
        )}

        {/* SUBMIT WORK */}
        {activeTab === 'submit' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl">
            <h2 className="text-2xl font-bold mb-2">Submit Work</h2>
            <p className="text-sm text-gray-400 mb-6">Select a task and submit your proof of work.</p>

            {/* Task list */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Available Tasks</h3>
              {allTasks.length === 0 ? (
                <div className="glass rounded-xl p-6 text-center text-gray-400 text-sm">No tasks found on-chain yet.</div>
              ) : (
                <div className="grid md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                  {allTasks.map((e: any, i: number) => {
                    const isSelected = selectedTask === e;
                    const subCount = getSubmissionCount(e.parsedJson?.task_id);
                    return (
                      <motion.div key={i} whileHover={{ scale: 1.02 }} onClick={() => { setSelectedTask(e); setSubmitData({ ...submitData, taskId: e.parsedJson?.task_id }); }}
                        className={`rounded-xl p-4 cursor-pointer border transition-all ${isSelected ? 'bg-amber-500/15 border-amber-500/60' : 'glass border-white/10 hover:border-amber-500/30'}`}>
                        <div className="flex items-start justify-between mb-1">
                          <h4 className="font-semibold text-sm">{e.parsedJson?.title}</h4>
                          {isSelected && <span className="text-amber-400 text-xs font-bold">✓ Selected</span>}
                        </div>
                        <div className="flex gap-3 text-xs text-gray-400 mb-1">
                          <span className="text-amber-400 font-semibold">💰 {(e.parsedJson?.reward_amount / 1e9 || 0).toFixed(2)} OTC</span>
                          <span>📬 {subCount} submissions</span>
                        </div>
                        <p className="text-xs text-gray-500 font-mono break-all">{e.parsedJson?.creator}</p>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Submit form */}
            <div className="glass rounded-2xl p-6">
              {selectedTask && (
                <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm">
                  <span className="text-amber-400 font-semibold">Submitting for: </span>
                  <span className="text-white">{selectedTask.parsedJson?.title}</span>
                  <span className="text-amber-400 ml-2">— {(selectedTask.parsedJson?.reward_amount / 1e9 || 0).toFixed(2)} OTC reward</span>
                </div>
              )}
              <div className="flex flex-col gap-4">
                <input className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
                  placeholder="Proof URL (GitHub, Figma, Doc link) *" value={submitData.proofUrl} onChange={(e) => setSubmitData({ ...submitData, proofUrl: e.target.value })} disabled={loading} />
                <textarea className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors resize-none"
                  placeholder="Describe your work..." rows={3} value={submitData.description} onChange={(e) => setSubmitData({ ...submitData, description: e.target.value })} disabled={loading} />
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={submitWork} disabled={loading || !selectedTask}
                  className="py-4 bg-gradient-to-r from-amber-500 to-red-500 rounded-xl font-bold text-lg disabled:opacity-30 disabled:cursor-not-allowed">
                  {loading ? '⏳ Submitting...' : !selectedTask ? '👆 Select a task above' : '📬 Submit Work'}
                </motion.button>
                {message && <div className={`p-3 rounded-xl text-sm text-center ${message.includes('✅') ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-300'}`}>{message}</div>}
              </div>
            </div>
          </motion.div>
        )}

        {/* MY TASKS — with submissions per task */}
        {activeTab === 'my-tasks' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-2xl font-bold mb-6">My Posted Tasks</h2>
            {myTasks.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <div className="text-5xl mb-4">🎯</div>
                <p className="text-gray-400 mb-4">No tasks posted yet</p>
                <button onClick={() => setActiveTab('post')} className="px-6 py-3 bg-gradient-to-r from-amber-500 to-red-500 rounded-xl font-semibold">Post Your First Bounty</button>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {myTasks.map((e: any, i: number) => {
                  const taskSubs = getTaskSubmissions(e.parsedJson?.task_id);
                  return (
                    <motion.div key={i} whileHover={{ scale: 1.01 }} className="glass rounded-2xl p-6">
                      {/* Task header */}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-xl font-bold mb-1">{e.parsedJson?.title}</h3>
                          <p className="text-amber-400 font-semibold">💰 {(e.parsedJson?.reward_amount / 1e9 || 0).toFixed(2)} OTC reward</p>
                        </div>
                        <span className="text-xs px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 font-semibold">
                          📬 {taskSubs.length} submission{taskSubs.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 font-mono break-all mb-4">Task ID: {e.parsedJson?.task_id}</p>

                      {/* Submissions list */}
                      {taskSubs.length === 0 ? (
                        <div className="glass rounded-xl p-4 text-center text-gray-500 text-sm">No submissions yet</div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Submissions</h4>
                          {taskSubs.map((s: any, j: number) => {
                            const sid = s.parsedJson?.submission_id;
                            const details = subDetails[sid];
                            // trigger fetch if not cached
                            if (!details && sid) fetchSubDetails(sid);
                            return (
                              <div key={j} className="glass rounded-xl p-4 border border-white/5">
                                <div className="flex items-start justify-between mb-3">
                                  <span className="text-sm font-semibold text-white">Submission #{j + 1}</span>
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">Pending Review</span>
                                </div>
                                <div className="grid md:grid-cols-2 gap-3 text-xs mb-3">
                                  <div>
                                    <p className="text-gray-500 mb-1">Submitter</p>
                                    <p className="text-gray-300 font-mono break-all">{s.parsedJson?.submitter}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500 mb-1">Submission ID</p>
                                    <p className="text-gray-300 font-mono break-all">{sid}</p>
                                  </div>
                                </div>
                                {details ? (
                                  <>
                                    {details.proofUrl && (
                                      <div className="mb-2">
                                        <p className="text-xs text-gray-500 mb-1">🔗 Proof of Work</p>
                                        <a href={details.proofUrl} target="_blank" rel="noopener noreferrer"
                                          className="text-xs text-amber-400 hover:text-amber-300 underline break-all">
                                          {details.proofUrl}
                                        </a>
                                      </div>
                                    )}
                                    {details.description && (
                                      <div className="mb-3">
                                        <p className="text-xs text-gray-500 mb-1">📝 Description</p>
                                        <p className="text-xs text-gray-300 leading-relaxed">{details.description}</p>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <p className="text-xs text-gray-500 italic mb-3">Loading submission details...</p>
                                )}
                                {/* Award bounty button */}
                                <button
                                  onClick={async () => {
                                    setLoading(true);
                                    setMessage('Awarding bounty...');
                                    try {
                                      const tx = new Transaction();
                                      tx.moveCall({
                                        target: `${PACKAGE_ID}::task_platform::award_bounty`,
                                        arguments: [tx.object(e.parsedJson?.task_id), tx.pure.address(s.parsedJson?.submitter)],
                                      });
                                      signAndExecute({ transaction: tx }, {
                                        onSuccess: () => { setMessage('✅ Bounty awarded!'); refetchTasks(); refetchSubmissions(); },
                                        onError: () => setMessage('❌ Failed to award bounty'),
                                      });
                                    } catch { setMessage('❌ Transaction failed'); }
                                    finally { setLoading(false); }
                                  }}
                                  disabled={loading}
                                  className="w-full py-2 bg-gradient-to-r from-amber-500 to-red-500 rounded-lg text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-40"
                                >
                                  🏆 Award Bounty to This Submitter
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* MY SUBMISSIONS — submitter's view */}
        {activeTab === 'my-submissions' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-2xl font-bold mb-2">My Submissions</h2>
            <p className="text-sm text-gray-400 mb-6">Track the status of all work you've submitted.</p>
            {mySubmissions.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <div className="text-5xl mb-4">📬</div>
                <p className="text-gray-400 mb-4">You haven't submitted any work yet</p>
                <button onClick={() => setActiveTab('submit')} className="px-6 py-3 bg-gradient-to-r from-amber-500 to-red-500 rounded-xl font-semibold">Browse Tasks</button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {mySubmissions.map((s: any, i: number) => {
                  const taskTitle = getTaskTitle(s.parsedJson?.task_id);
                  const taskReward = getTaskReward(s.parsedJson?.task_id);
                  return (
                    <motion.div key={i} whileHover={{ scale: 1.01 }} className="glass rounded-2xl p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-bold mb-1">{taskTitle}</h3>
                          <p className="text-amber-400 font-semibold text-sm">💰 {(taskReward / 1e9).toFixed(2)} OTC at stake</p>
                        </div>
                        <span className="text-xs px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 font-semibold">
                          ⏳ Pending Review
                        </span>
                      </div>
                      <div className="grid md:grid-cols-2 gap-3 text-xs mb-3">
                        <div className="glass rounded-lg p-3">
                          <p className="text-gray-500 mb-1">Task ID</p>
                          <p className="text-gray-300 font-mono break-all">{s.parsedJson?.task_id}</p>
                        </div>
                        <div className="glass rounded-lg p-3">
                          <p className="text-gray-500 mb-1">Submission ID</p>
                          <p className="text-gray-300 font-mono break-all">{s.parsedJson?.submission_id}</p>
                        </div>
                      </div>
                      {(() => {
                        const sid = s.parsedJson?.submission_id;
                        const details = subDetails[sid];
                        if (!details && sid) fetchSubDetails(sid);
                        return details ? (
                          <div className="flex flex-col gap-2 text-xs mb-3">
                            {details.proofUrl && (
                              <div className="glass rounded-lg p-3">
                                <p className="text-gray-500 mb-1">🔗 Your Proof URL</p>
                                <a href={details.proofUrl} target="_blank" rel="noopener noreferrer"
                                  className="text-amber-400 hover:text-amber-300 underline break-all">{details.proofUrl}</a>
                              </div>
                            )}
                            {details.description && (
                              <div className="glass rounded-lg p-3">
                                <p className="text-gray-500 mb-1">📝 Your Description</p>
                                <p className="text-gray-300 leading-relaxed">{details.description}</p>
                              </div>
                            )}
                          </div>
                        ) : <p className="text-xs text-gray-500 italic mb-3">Loading your submission details...</p>;
                      })()}
                      <p className="text-xs text-gray-500">
                        ⏳ Awaiting review by the task creator. You'll receive {(taskReward / 1e9).toFixed(2)} OTC if selected as winner.
                      </p>                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;

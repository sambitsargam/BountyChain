import { useNavigate } from 'react-router-dom';
import { ConnectButton, useCurrentAccount, useSuiClientQuery } from '@onelabs/dapp-kit';
import { motion } from 'framer-motion';

const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID;

const CATEGORY_COLORS: Record<string, string> = {
  Development: 'bg-blue-500/20 text-blue-400',
  Design: 'bg-pink-500/20 text-pink-400',
  Writing: 'bg-green-500/20 text-green-400',
  Research: 'bg-purple-500/20 text-purple-400',
  General: 'bg-gray-500/20 text-gray-400',
};

function Explore() {
  const navigate = useNavigate();
  const account = useCurrentAccount();

  const { data: taskEvents, isLoading: loadingTasks } = useSuiClientQuery('queryEvents', {
    query: { MoveEventType: `${PACKAGE_ID}::task_platform::TaskCreated` }, limit: 50,
  }, { refetchInterval: 3000 });

  const { data: submissionEvents, isLoading: loadingSubmissions } = useSuiClientQuery('queryEvents', {
    query: { MoveEventType: `${PACKAGE_ID}::task_platform::SubmissionMade` }, limit: 200,
  }, { refetchInterval: 3000 });

  const tasks = taskEvents?.data || [];
  const submissions = submissionEvents?.data || [];
  const isLoading = loadingTasks || loadingSubmissions;

  const getSubCount = (taskId: string) => submissions.filter((s: any) => s.parsedJson?.task_id === taskId).length;

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="fixed top-0 left-0 right-0 z-[100] glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <motion.div className="flex items-center gap-2 cursor-pointer" whileHover={{ scale: 1.05 }} onClick={() => navigate('/')}>
            <span className="text-2xl">🧩</span>
            <span className="text-lg font-bold text-gradient-bounty">BountyChain</span>
          </motion.div>
          <div className="flex items-center gap-4">
            {account && <button onClick={() => navigate('/app')} className="text-sm text-gray-300 hover:text-white transition-colors">Dashboard</button>}
            <ConnectButton />
          </div>
        </div>
      </nav>

      <div className="pt-24 px-6 pb-12 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Explore <span className="text-gradient-bounty">Bounties</span></h1>
          <p className="text-gray-400">Browse open tasks and earn OTC rewards on OneChain</p>
        </motion.div>

        {isLoading ? (
          <div className="text-center py-20 text-gray-400">Loading bounties...</div>
        ) : tasks.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <div className="text-5xl mb-4">🎯</div>
            <p className="text-gray-400 mb-4">No bounties yet. Post the first one!</p>
            <button onClick={() => navigate('/app')} className="px-6 py-3 bg-gradient-to-r from-amber-500 to-red-500 rounded-xl font-semibold">Post Bounty</button>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-5">
            {tasks.map((e: any, i: number) => {
              const subCount = getSubCount(e.parsedJson?.task_id);
              const category = e.parsedJson?.category || 'General';
              const colorClass = CATEGORY_COLORS[category] || CATEGORY_COLORS['General'];
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  whileHover={{ scale: 1.03, y: -5 }} className="glass rounded-2xl p-6 flex flex-col cursor-pointer">
                  <div className="flex items-start justify-between mb-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${colorClass}`}>{category}</span>
                    <span className="text-xs text-gray-500">📬 {subCount}</span>
                  </div>
                  <h3 className="text-lg font-bold mb-2">{e.parsedJson?.title}</h3>
                  <p className="text-amber-400 font-bold text-xl mb-3">💰 {(e.parsedJson?.reward_amount / 1e9 || 0).toFixed(2)} OTC</p>
                  <p className="text-xs text-gray-500 font-mono break-all mb-4">Creator: {e.parsedJson?.creator}</p>
                  <button onClick={() => navigate('/app')}
                    className="mt-auto w-full py-2 bg-gradient-to-r from-amber-500/20 to-red-500/20 border border-amber-500/30 rounded-lg text-sm font-medium hover:from-amber-500/30 hover:to-red-500/30 transition-all">
                    Submit Work →
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Explore;

import { useNavigate } from 'react-router-dom';
import { ConnectButton, useCurrentAccount } from '@onelabs/dapp-kit';
import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';

function Landing() {
  const navigate = useNavigate();
  const account = useCurrentAccount();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [shouldNavigate, setShouldNavigate] = useState(false);
  const connectButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => setMousePosition({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    if (account && shouldNavigate) { navigate('/app'); setShouldNavigate(false); }
  }, [account, shouldNavigate, navigate]);

  const handleGetStarted = () => {
    if (account) navigate('/app');
    else { setShouldNavigate(true); setTimeout(() => connectButtonRef.current?.querySelector('button')?.click(), 100); }
  };

  const cv = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.3 } } };
  const iv = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: 'spring' as const, stiffness: 100 } } };

  const features = [
    { icon: '🎯', title: 'AI Task Matching', description: 'GPT-4 scores submissions and matches tasks with the best contributors.' },
    { icon: '💰', title: 'Instant OTC Rewards', description: 'Automated on-chain payments when work is approved.' },
    { icon: '🔍', title: 'Quality Validation', description: 'AI evaluates every submission for quality before reward.' },
    { icon: '🧩', title: 'Any Category', description: 'Dev, design, writing, research — any task type supported.' },
    { icon: '🔐', title: 'Trustless Escrow', description: 'Rewards locked in smart contract until task is complete.' },
    { icon: '📊', title: 'Live Leaderboard', description: 'Track top contributors and their earned bounties.' },
  ];

  const steps = [
    { number: '01', title: 'Post Bounty', description: 'Set task & lock reward', icon: '📝' },
    { number: '02', title: 'Contributors Apply', description: 'Submit proof of work', icon: '🙋' },
    { number: '03', title: 'AI Scores Work', description: 'Quality auto-evaluated', icon: '🤖' },
    { number: '04', title: 'Reward Paid', description: 'Winner gets OTC instantly', icon: '💸' },
  ];

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-red-500/10" />
        <motion.div className="absolute w-96 h-96 bg-amber-500/20 rounded-full blur-3xl"
          animate={{ x: mousePosition.x - 200, y: mousePosition.y - 200 }} transition={{ type: 'spring', damping: 30 }} />
        <div className="absolute top-20 left-20 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <motion.nav initial={{ y: -100 }} animate={{ y: 0 }} className="fixed top-0 left-0 right-0 z-[100] glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <motion.div className="flex items-center gap-2 cursor-pointer" whileHover={{ scale: 1.05 }} onClick={() => navigate('/')}>
            <span className="text-3xl">🧩</span>
            <span className="text-xl font-bold text-gradient-bounty">BountyChain</span>
          </motion.div>
          <div className="flex items-center gap-6">
            <motion.button whileHover={{ scale: 1.05 }} onClick={() => navigate('/explore')} className="text-sm text-gray-300 hover:text-white transition-colors">Explore Bounties</motion.button>
            <div ref={connectButtonRef}><ConnectButton /></div>
          </div>
        </div>
      </motion.nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6 z-0">
        <div className="max-w-7xl mx-auto">
          <motion.div variants={cv} initial="hidden" animate="visible" className="text-center max-w-4xl mx-auto">
            <motion.div variants={iv} className="inline-flex items-center gap-2 px-3 py-1.5 glass rounded-full mb-6">
              <span className="text-xl">🤖</span>
              <span className="text-xs font-medium">AI-Powered Bounty Platform</span>
            </motion.div>
            <motion.h1 variants={iv} className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Earn Bounties.<br /><span className="text-gradient-bounty">Build the Future.</span>
            </motion.h1>
            <motion.p variants={iv} className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto">
              Post tasks, submit work, and earn OTC rewards on OneChain. AI validates every submission for fair, trustless payouts.
            </motion.p>
            <motion.div variants={iv} className="flex flex-wrap items-center justify-center gap-4 mb-16">
              <motion.button whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(245,158,11,0.5)' }} whileTap={{ scale: 0.95 }}
                onClick={handleGetStarted} className="px-8 py-4 bg-gradient-to-r from-amber-500 to-red-500 rounded-xl font-semibold text-lg flex items-center gap-2">
                Post a Bounty <motion.span animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>→</motion.span>
              </motion.button>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/explore')} className="px-8 py-4 glass rounded-xl font-semibold text-lg hover:bg-white/10 transition-colors">
                Browse Bounties
              </motion.button>
            </motion.div>
            <motion.div variants={iv} className="grid grid-cols-3 gap-6 max-w-3xl mx-auto">
              {[{ value: '300+', label: 'Active Bounties' }, { value: '50K+', label: 'OTC Rewarded' }, { value: '2K+', label: 'Contributors' }].map((s, i) => (
                <motion.div key={i} whileHover={{ scale: 1.05 }} className="glass rounded-2xl p-5">
                  <div className="text-3xl font-bold text-gradient-bounty mb-1">{s.value}</div>
                  <div className="text-xs text-gray-400">{s.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Live Stats */}
      <section className="relative py-20 px-6 z-0">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-3">Platform <span className="text-gradient-bounty">Activity</span></h2>
            <p className="text-lg text-gray-400">Real-time bounty ecosystem stats</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="glass rounded-3xl p-6 glow-bounty">
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { icon: '🎯', value: '48', label: 'Open Tasks', color: 'from-amber-500 to-orange-500' },
                { icon: '📬', value: '156', label: 'Submissions Today', color: 'from-red-500 to-pink-500' },
                { icon: '🏆', value: '12K', label: 'OTC Paid Today', color: 'from-amber-600 to-red-500' },
              ].map((item, i) => (
                <motion.div key={i} whileHover={{ scale: 1.05, y: -5 }} className="glass rounded-2xl p-5 cursor-pointer text-center">
                  <div className="text-3xl mb-3">{item.icon}</div>
                  <div className={`text-3xl font-bold bg-gradient-to-r ${item.color} bg-clip-text text-transparent mb-1`}>{item.value}</div>
                  <div className="text-sm text-gray-400">{item.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="relative py-20 px-6 z-0">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-3">Why <span className="text-gradient-bounty">BountyChain</span>?</h2>
            <p className="text-lg text-gray-400">The fairest way to get work done on-chain</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.1 }} whileHover={{ scale: 1.05, y: -10 }} className="glass rounded-2xl p-6 cursor-pointer">
                <div className="text-4xl mb-3">{f.icon}</div>
                <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative py-20 px-6 z-0">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-3">How It Works</h2>
            <p className="text-lg text-gray-400">From task to reward in four steps</p>
          </motion.div>
          <div className="grid md:grid-cols-4 gap-5">
            {steps.map((step, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.2 }} whileHover={{ scale: 1.05 }} className="glass rounded-2xl p-6 relative">
                <div className="text-5xl font-bold text-white/10 absolute top-3 right-3">{step.number}</div>
                <div className="text-4xl mb-3">{step.icon}</div>
                <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                <p className="text-sm text-gray-400">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 px-6 z-0">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="glass rounded-3xl p-12 glow-bounty">
            <h2 className="text-4xl font-bold mb-4">Ready to Earn?</h2>
            <p className="text-lg text-gray-400 mb-8">Browse open bounties and start earning OTC today</p>
            <motion.button whileHover={{ scale: 1.05, boxShadow: '0 0 60px rgba(245,158,11,0.6)' }} whileTap={{ scale: 0.95 }}
              onClick={handleGetStarted} className="px-10 py-4 bg-gradient-to-r from-amber-500 to-red-500 rounded-xl font-bold text-lg">
              Start Earning →
            </motion.button>
          </motion.div>
        </div>
      </section>

      <footer className="relative border-t border-white/10 py-10 px-6 z-0">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3"><span className="text-2xl">🧩</span><span className="text-lg font-bold text-gradient-bounty">BountyChain</span></div>
              <p className="text-gray-400 text-xs">Decentralized bounties on OneChain</p>
            </div>
            {[
              { title: 'Platform', links: ['Browse Tasks', 'Post Bounty', 'Leaderboard'] },
              { title: 'Resources', links: ['Documentation', 'API', 'Support'] },
              { title: 'Company', links: ['About', 'Blog', 'Contact'] },
            ].map((col, i) => (
              <div key={i}>
                <h4 className="font-semibold mb-3 text-sm">{col.title}</h4>
                {col.links.map((link, j) => <div key={j} className="text-gray-400 text-xs mb-2 hover:text-white cursor-pointer transition-colors">{link}</div>)}
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-xs">© 2026 BountyChain. All rights reserved.</p>
            <div className="flex gap-6 text-xs text-gray-400">
              {['Twitter', 'GitHub', 'Discord'].map(s => <span key={s} className="hover:text-white cursor-pointer transition-colors">{s}</span>)}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;

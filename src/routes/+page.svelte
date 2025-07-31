<script>
	import { supabase } from '$lib/supabase.js';
	import PotMarketCard from '$lib/components/PotMarketCard.svelte';
	import TwitchAuth from '$lib/components/TwitchAuth.svelte';
	import ParlaySlip from '$lib/components/ParlaySlip.svelte';
	import { onMount } from 'svelte';

	let events = [];
	let markets = [];
	let user = null;
	let userProfile = null;
	let loading = true;
	let selectedParlayBets = [];

	onMount(async () => {
		// Get current user
		const { data: { session } } = await supabase.auth.getSession();
		user = session?.user ?? null;

		// Listen for auth changes
		supabase.auth.onAuthStateChange(async (event, session) => {
			user = session?.user ?? null;
			if (user) {
				await loadUserProfile();
			} else {
				userProfile = null;
				selectedParlayBets = [];
			}
		});

		// Load initial data
		await loadMarkets();
		if (user) {
			await loadUserProfile();
		}
		
		// Set up real-time subscriptions for pot updates
		setupRealTimeSubscriptions();
		
		loading = false;
	});

	async function loadMarkets() {
		const { data } = await supabase
			.from('markets')
			.select(`
				*,
				events (*)
			`)
			.eq('status', 'open')
			.order('created_at', { ascending: false });

		markets = data || [];
	}

	async function loadUserProfile() {
		if (!user) return;
		
		const { data } = await supabase
			.from('users')
			.select('*')
			.eq('user_id', user.id)
			.single();
		
		userProfile = data;
	}

	function setupRealTimeSubscriptions() {
		// Subscribe to market pot updates
		supabase
			.channel('market-updates')
			.on('postgres_changes', 
				{ event: 'UPDATE', schema: 'public', table: 'markets' },
				(payload) => {
					// Update the specific market in our local state
					markets = markets.map(market => 
						market.id === payload.new.id ? payload.new : market
					);
				}
			)
			.subscribe();
	}

	async function handleSingleBet(event) {
		const { marketId, side, stake, marketTitle, sideLabel } = event.detail;
		
		if (!user || !userProfile || stake > userProfile.coins) {
			alert('Insufficient coins!');
			return;
		}

		// Check betting limits
		const canBet = await checkSingleBetLimits(marketId, side);
		if (!canBet) return;

		try {
			// Place the bet
			const { error: betError } = await supabase
				.from('single_bets')
				.insert({
					user_id: user.id,
					market_id: marketId,
					side,
					stake
				});

			if (betError) throw betError;

			// Update market pot totals
			const market = markets.find(m => m.id === marketId);
			const sideField = side === 'side_a' ? 'side_a_total' : 'side_b_total';
			const newTotal = market[sideField] + stake;

			const { error: marketError } = await supabase
				.from('markets')
				.update({ [sideField]: newTotal })
				.eq('id', marketId);

			if (marketError) throw marketError;

			// Update user coins
			const { error: userError } = await supabase
				.from('users')
				.update({ 
					coins: userProfile.coins - stake,
					total_bets: userProfile.total_bets + 1
				})
				.eq('user_id', user.id);

			if (userError) throw userError;

			// Reload user profile
			await loadUserProfile();
			
		} catch (error) {
			console.error('Error placing bet:', error);
			alert('Error placing bet. Please try again.');
		}
	}

	async function checkSingleBetLimits(marketId, side) {
		// Check how many bets user has on this specific market + side
		const { count } = await supabase
			.from('single_bets')
			.select('*', { count: 'exact', head: true })
			.eq('user_id', user.id)
			.eq('market_id', marketId)
			.eq('side', side)
			.eq('status', 'pending');

		if (count >= 3) {
			alert('Maximum 3 bets per market side reached!');
			return false;
		}

		return true;
	}

	async function checkParlayLimits() {
		// Check how many active parlays user has
		const { count } = await supabase
			.from('parlay_bets')
			.select('*', { count: 'exact', head: true })
			.eq('user_id', user.id)
			.eq('status', 'pending');

		if (count >= 3) {
			alert('Maximum 3 active parlays reached!');
			return false;
		}

		return true;
	}

	function addToParlaySlip(event) {
		const { marketId, side, marketTitle, sideLabel } = event.detail;
		
		// Check if market already in parlay
		const existingIndex = selectedParlayBets.findIndex(bet => bet.marketId === marketId);
		
		if (existingIndex >= 0) {
			// Update existing leg with new side selection
			selectedParlayBets[existingIndex] = { marketId, side, marketTitle, sideLabel };
		} else {
			// Add new leg
			selectedParlayBets = [...selectedParlayBets, { marketId, side, marketTitle, sideLabel }];
		}
	}

	function handleParlayPlaced() {
		// Reload user profile to get updated coin balance
		loadUserProfile();
	}
</script>

<div class="container">
	<header>
		<div class="header-content">
			<div class="title-section">
				<h1 class="sakura-title">SakuzaBets</h1>
				<p>🌸 Quitters never win and winners never quit 🌸</p>
			</div>
			<div class="auth-section">
				<TwitchAuth />
			</div>
		</div>
		
		{#if userProfile}
			<div class="user-stats">
				<span class="coins">{userProfile.coins} coins</span>
				<span class="stats">{userProfile.total_wins}W - {userProfile.total_bets - userProfile.total_wins}L</span>
			</div>
		{/if}
	</header>

	{#if loading}
		<p>Loading markets...</p>
	{:else if !user}
		<div class="login-prompt">
			<h2>Sign in to start betting!</h2>
			<p>Connect with Twitch to place bets and compete with the community.</p>
		</div>
	{:else}
		<main>
			<div class="betting-modes">
				<h2>Ill break your kneecaps</h2>
				<p>Place single bets in market pots, or combine picks for massive parlay payouts! 🌸</p>
			</div>

			<div class="markets-section">
				{#each markets as market}
					<PotMarketCard 
						{market}
						on:placeBet={handleSingleBet}
						on:addToParlay={addToParlaySlip}
					/>
				{/each}
			</div>

			<ParlaySlip 
				bind:selectedLegs={selectedParlayBets}
				{user}
				userCoins={userProfile?.coins || 0}
				on:parlayPlaced={handleParlayPlaced}
			/>
		</main>
	{/if}
</div>

<style>
	header {
		padding: var(--space-6) 0;
		border-bottom: 1px solid var(--border-color);
		margin-bottom: var(--space-6);
	}

	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-4);
	}

	.sakura-title {
		font-size: 2.5rem;
		background: linear-gradient(135deg, var(--primary-light) 0%, var(--sakura-pink) 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		margin-bottom: var(--space-2);
		font-weight: 700;
	}

	.title-section p {
		color: var(--text-secondary);
		font-size: 1.1rem;
	}

	.user-stats {
		display: flex;
		gap: var(--space-4);
		justify-content: center;
		padding: var(--space-4);
		background: linear-gradient(135deg, var(--bg-secondary) 0%, #1f2937 100%);
		border: 1px solid var(--border-sakura);
		border-radius: var(--border-radius);
		position: relative;
	}

	.user-stats::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 1px;
		background: linear-gradient(90deg, transparent 0%, var(--sakura-pink) 50%, transparent 100%);
		opacity: 0.5;
	}

	.coins {
		color: var(--success);
		font-weight: bold;
		font-size: 1.1rem;
	}

	.stats {
		color: var(--text-secondary);
	}

	.login-prompt {
		text-align: center;
		padding: var(--space-6);
		background: var(--bg-secondary);
		border-radius: var(--border-radius);
		margin: var(--space-6) auto;
		max-width: 500px;
	}

	.login-prompt h2 {
		color: var(--text-primary);
		margin-bottom: var(--space-2);
	}

	.login-prompt p {
		color: var(--text-secondary);
	}

	.betting-modes {
		text-align: center;
		margin-bottom: var(--space-6);
		padding: var(--space-4);
		background: linear-gradient(135deg, var(--bg-secondary) 0%, #1f2937 100%);
		border-radius: var(--border-radius);
		border: 1px solid var(--border-color);
	}

	.betting-modes h2 {
		color: var(--text-primary);
		margin-bottom: var(--space-2);
	}

	.betting-modes p {
		color: var(--text-secondary);
		font-size: 1.1rem;
	}

	@media (max-width: 768px) {
		.header-content {
			flex-direction: column;
			gap: var(--space-4);
			text-align: center;
		}

		.user-stats {
			flex-direction: column;
			gap: var(--space-2);
		}
	}
</style>
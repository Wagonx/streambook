import { createClient } from '@supabase/supabase-js'
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public'

export const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY)

// Type definitions for pot-based betting system
export type User = {
  user_id: string
  twitch_username: string
  avatar_url?: string
  coins: number
  total_wins: number
  total_bets: number
  created_at: string
}

export type Event = {
  id: string
  title: string
  category: string
  description?: string
  active: boolean
  created_at: string
}

export type Market = {
  id: string
  event_id: string
  title: string
  description?: string
  market_type: string
  line?: number
  side_a_label: string
  side_b_label: string
  side_a_total: number
  side_b_total: number
  status: 'open' | 'closed' | 'resolved'
  winning_side?: 'side_a' | 'side_b'
  created_at: string
}

export type SingleBet = {
  id: string
  user_id: string
  market_id: string
  side: 'side_a' | 'side_b'
  stake: number
  potential_payout?: number
  status: 'pending' | 'won' | 'lost'
  created_at: string
}

export type ParlayBet = {
  id: string
  user_id: string
  legs: Array<{
    market_id: string
    side: 'side_a' | 'side_b'
    market_title?: string
    side_label?: string
  }>
  total_stake: number
  potential_payout?: number
  status: 'pending' | 'won' | 'lost'
  created_at: string
}

export type ParlayPot = {
  id: string
  total_pot: number
  created_at: string
}

// Betting utility functions
export function calculateMarketPayout(userStake: number, marketSide: 'side_a' | 'side_b', market: Market): number {
  const totalPot = market.side_a_total + market.side_b_total;
  if (totalPot === 0) return userStake; // Return stake if no other bets
  
  const winningSideTotal = marketSide === 'side_a' ? market.side_a_total : market.side_b_total;
  if (winningSideTotal === 0) return 0; // No payout if no one bet on winning side
  
  return (userStake / winningSideTotal) * totalPot;
}

export function calculateParlayPayout(userStake: number, totalWinningStakes: number, totalParlayPot: number): number {
  if (totalWinningStakes === 0) return 0;
  return (userStake / totalWinningStakes) * totalParlayPot;
}

export function getEstimatedSinglePayout(userStake: number, marketSide: 'side_a' | 'side_b', market: Market): number {
  // Simulate what payout would be if this bet wins
  const currentPot = market.side_a_total + market.side_b_total;
  const newPot = currentPot + userStake;
  const newWinningSideTotal = (marketSide === 'side_a' ? market.side_a_total : market.side_b_total) + userStake;
  
  return (userStake / newWinningSideTotal) * newPot;
}
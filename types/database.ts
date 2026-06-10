export interface CampaignConfig {
  campaign_name: string
  campaign_goal: number
  phase_label: string
  phase_goal: number
  phase_description: string
}

export interface RenovationItem {
  id: string
  title: string
  description: string
  estimated_cost: number
  display_order: number
}

export interface DonorWallItem {
  id: string
  full_name: string
  amount_dollars: number
  donor_type: string
  graduation_year?: number
  tier_label?: string
}

export interface FundraisingStats {
  total_raised_dollars: number
  total_donors: number
  campaign_goal_pct: number
  phase_goal_pct: number
}
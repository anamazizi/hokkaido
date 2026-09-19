export interface CustomerReview {
  id: string
  customer_name: string
  rating: number // 1-5
  review_text: string
  verification_code: string
  honeypot?: string | null
  is_approved: boolean
  created_at: string
  updated_at: string
}

export interface ReviewSubmission {
  customer_name: string
  rating: number
  review_text: string
  verification_code: string
  user_entered_code: string
  honeypot?: string
}
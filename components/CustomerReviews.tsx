'use client'

import { useState, useEffect, FormEvent, useRef } from 'react'
import { Star, RefreshCw, Send, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { CustomerReview } from '@/types/review'

export default function CustomerReviews() {
  // State for review form
  const [customerName, setCustomerName] = useState('')
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [userEnteredCode, setUserEnteredCode] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
const canvasRef = useRef<HTMLCanvasElement>(null)

  // State for approved reviews display
  const [approvedReviews, setApprovedReviews] = useState<CustomerReview[]>([])
  const [displayCount, setDisplayCount] = useState(7)
  const [isLoadingReviews, setIsLoadingReviews] = useState(true)

  // Function to draw verification code on canvas
  const drawCanvas = (code: string) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw light gray background
    ctx.fillStyle = '#f3f4f6' // gray-100
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw random lines for noise
    ctx.strokeStyle = '#d1d5db' // gray-300
    ctx.lineWidth = 1
    for (let i = 0; i < 5; i++) {
      ctx.beginPath()
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height)
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height)
      ctx.stroke()
    }

    // Draw the code
    ctx.font = 'bold 20px monospace'
    ctx.fillStyle = '#1f2937' // slate-900
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(code, canvas.width / 2, canvas.height / 2)
  }

  // Generate random 6-digit verification code and draw on canvas
  const generateVerificationCode = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    setVerificationCode(code)
    drawCanvas(code)
    return code
  }

  // Initialize verification code on component mount
  useEffect(() => {
    generateVerificationCode()
  }, [])

  // Fetch approved reviews
  useEffect(() => {
    const fetchApprovedReviews = async () => {
      try {
        const { data, error } = await supabase
          .from('customer_reviews')
          .select('*')
          .eq('is_approved', true)
          .order('created_at', { ascending: false })

        if (error) throw error
        setApprovedReviews(data || [])
      } catch (error) {
        console.error('Error fetching reviews:', error)
      } finally {
        setIsLoadingReviews(false)
      }
    }

    fetchApprovedReviews()
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    // Honeypot trap: if honeypot field is filled, silently reject
    if (honeypot.trim() !== '') {
      console.log('Bot submission detected via honeypot')
      resetForm()
      setSubmitSuccess(true) // Fake success to avoid spamming
      setTimeout(() => setSubmitSuccess(false), 3000)
      return
    }

    // Validate verification code
    if (userEnteredCode !== verificationCode) {
      alert('Kod pengesahan tidak tepat. Sila masukkan 6 angka seperti yang dipaparkan.')
      return
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      alert('Sila berikan penarafan bintang (1 hingga 5).')
      return
    }

    // Validate name and review text
    if (!customerName.trim() || !reviewText.trim()) {
      alert('Sila isi nama dan ulasan anda.')
      return
    }

    setIsSubmitting(true)

    try {
      const { data, error } = await supabase.from('customer_reviews').insert([{
        customer_name: customerName.trim(),
        rating,
        review_text: reviewText.trim(),
        verification_code: verificationCode,
        honeypot: honeypot.trim() || null,
        is_approved: false
      }])

      if (error) {
        console.error('CRITICAL: Ralat simpan ulasan ke Supabase:', error)
        alert('Gagal menghantar ulasan: ' + error.message)
        return
      }

      // Success
      resetForm()
      generateVerificationCode()
      setSubmitSuccess(true)
    } catch (error) {
      console.error('Error submitting review:', error)
      alert(`Ralat menghantar ulasan: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setCustomerName('')
    setRating(0)
    setReviewText('')
    setUserEnteredCode('')
    setHoneypot('')
  }

  const handleLoadMore = () => {
    setDisplayCount(prev => prev + 3)
  }

  const displayedReviews = approvedReviews.slice(0, displayCount)
  const hasMoreReviews = displayCount < approvedReviews.length

  // JSX will be added in the next editor call
return (
    <div id="ulasan" className="space-y-8 scroll-mt-6">
      {/* Review Submission Form */}
      <div className="bg-white/90 backdrop-blur border border-amber-200/60 shadow-md rounded-2xl p-6">
        <h2 className="text-base font-bold text-slate-900 mb-6 flex items-center whitespace-nowrap">
          <Star className="mr-3 h-7 w-7 text-amber-500 flex-shrink-0" />
          Berikan Ulasan Anda
        </h2>
        
        {submitSuccess ? (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50/50 p-6 rounded-xl border border-green-300 mb-6">
            <h3 className="text-xl font-semibold text-green-800 mb-2">Terima kasih!</h3>
            <p className="text-green-700">
              Ulasan anda telah berjaya dihantar dan akan dipaparkan selepas disemak oleh pengurus.
            </p>
          </div>
        ) : null}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nama Pelanggan
            </label>
            <input
              type="text"
              required
              className="w-full p-3 border border-gray-300 rounded-lg text-slate-900 bg-white placeholder:text-gray-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              placeholder="Nama anda"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>

          {/* Star Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Penarafan Bintang
            </label>
            <div className="flex flex-col items-start">
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="p-1 focus:outline-none"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                  >
                    <Star
                      className={`h-10 w-10 ${
                        (hoverRating || rating) >= star
                          ? 'fill-amber-400 stroke-amber-500'
                          : 'fill-gray-200 stroke-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-1 block">
                Klik 5 bintang jika anda suka
              </p>
            </div>
          </div>

          {/* Review Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ulasan / Komen Anda
            </label>
            <textarea
              required
              className="w-full p-3 border border-gray-300 rounded-lg text-slate-900 bg-white placeholder:text-gray-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              placeholder="Ceritakan pengalaman anda dengan Hokkaido Inti Jebok..."
              rows={4}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
            />
          </div>
{/* Verification Code with Canvas Captcha */}
          <div className="bg-gray-50/70 rounded-xl p-5 border border-gray-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kod Pengesahan (Anti-Spam)
                </label>
                <p className="text-sm text-gray-600">
                  Sila taip 6 angka yang dipaparkan di bawah:
                </p>
              </div>
              <div className="flex items-center gap-3">
                <canvas
                  ref={canvasRef}
                  width="130"
                  height="40"
                  className="border border-gray-300 rounded bg-gray-100"
                />
                <button
                  type="button"
                  onClick={() => generateVerificationCode()}
                  className="p-3 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 transition"
                  title="Jana semula kod"
                >
                  <RefreshCw className="h-5 w-5" />
                </button>
              </div>
            </div>
            <input
              type="text"
              required
              maxLength={6}
              pattern="[0-9]{6}"
              className="w-full p-3 border border-gray-300 rounded-lg text-slate-900 bg-white placeholder:text-gray-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              placeholder="Masukkan 6 angka di atas"
              value={userEnteredCode}
              onChange={(e) => setUserEnteredCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </div>

          {/* Honeypot field (hidden from humans) */}
          <div className="absolute opacity-0 pointer-events-none h-0 overflow-hidden">
            <label htmlFor="honeypot">Jangan isi ruangan ini</label>
            <input
              type="text"
              id="honeypot"
              name="honeypot"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:bg-gray-400 text-white font-bold rounded-lg transition shadow-md flex items-center justify-center"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                Menghantar...
              </>
            ) : (
              <>
                <Send className="mr-3 h-5 w-5" />
                Hantar Ulasan
              </>
            )}
          </button>
        </form>
      </div>

      {/* Approved Reviews Display */}
      <div className="bg-white/90 backdrop-blur border border-slate-200/60 shadow-md rounded-2xl p-6">
        <h2 className="text-base font-bold text-slate-900 mb-6 flex items-center whitespace-nowrap">
          <Star className="mr-3 h-7 w-7 text-amber-500 flex-shrink-0" />
          Ulasan Pelanggan
        </h2>

        {isLoadingReviews ? (
          <div className="text-center py-12">
            <Loader2 className="h-10 w-10 animate-spin text-amber-500 mx-auto mb-4" />
            <p className="text-slate-600">Memuatkan ulasan...</p>
          </div>
        ) : displayedReviews.length === 0 ? (
          <div className="text-center py-12 bg-slate-50/50 rounded-xl">
            <Star className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Belum ada ulasan yang diluluskan.</p>
            <p className="text-slate-400 text-sm mt-2">Jadilah yang pertama memberikan ulasan!</p>
          </div>
        ) : (
          <>
            <div className="space-y-6">
              {displayedReviews.map((review) => (
                <div
                  key={review.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">
                        {review.customer_name}
                      </h3>
                      <div className="flex items-center mt-1">
                        {/* Star display */}
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-5 w-5 ${
                              i < review.rating
                                ? 'fill-amber-400 stroke-amber-500'
                                : 'fill-gray-200 stroke-gray-300'
                            }`}
                          />
                        ))}
                        <span className="ml-3 text-sm text-slate-500">
                          {new Date(review.created_at).toLocaleDateString('ms-MY', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-slate-700 whitespace-pre-wrap">{review.review_text}</p>
                </div>
              ))}
            </div>

            {/* Load More Button */}
            {hasMoreReviews && (
              <div className="mt-8 text-center">
                <button
                  onClick={handleLoadMore}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-medium rounded-lg transition shadow-md"
                >
                  Lihat Lagi Ulasan ({approvedReviews.length - displayCount} lagi)
                </button>
                <p className="text-sm text-slate-500 mt-2">
                  Memaparkan {displayCount} daripada {approvedReviews.length} ulasan
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
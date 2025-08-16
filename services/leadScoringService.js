class LeadScoringService {
  constructor() {
    // Scoring weights for different criteria
    this.weights = {
      // Demographics / Firmographics
      role_in_decision: {
        'Decision Maker': 30,
        'Influencer': 15,
        'End User': 5,
        'Champion': 20,
        'Gatekeeper': 10,
        'Technical Evaluator': 15,
        'Intern': 0
      },
      
      company_size: {
        'large': 20,    // >500 employees
        'medium': 10,   // 50-500 employees
        'small': 0      // <50 employees
      },
      
      industry: {
        'Technology': 15,
        'Healthcare': 15,
        'Finance': 15,
        'Manufacturing': 10,
        'Retail': 8,
        'Education': 10,
        'Other': 0
      },
      
      location: {
        'target_region': 10,
        'non_target': 0
      },
      
      // Source Quality
      lead_source: {
        'Website demo request': 40,
        'Demo Request': 40,
        'Referral': 30,
        'Event/Conference': 20,
        'Trade Show': 20,
        'Cold outreach list': 5,
        'Cold Email': 5,
        'LinkedIn': 15,
        'Website': 10,
        'Other': 0
      },
      
      // Engagement / Activity
      base_score: 5,
      notes_added: 10,
      follow_up_scheduled: 10,
      status_contacted: 15,
      
      // Decay
      no_update_30_days: -10,
      status_cold: -30
    };
    
    // Score ranges for classification
    this.scoreRanges = {
      'Hot': { min: 70, max: 100 },
      'Warm': { min: 40, max: 69 },
      'Cold': { min: 0, max: 39 },
      'Disqualified': { min: -100, max: -1 }
    };
  }

  /**
   * Calculate lead score based on all available data
   */
  calculateLeadScore(lead) {
    let totalScore = 0;
    
    // 1. Demographics / Firmographics
    totalScore += this.calculateDemographicsScore(lead);
    
    // 2. Source Quality
    totalScore += this.calculateSourceQualityScore(lead);
    
    // 3. Engagement / Activity
    totalScore += this.calculateEngagementScore(lead);
    
    // 4. Decay Over Time
    totalScore += this.calculateDecayScore(lead);
    
    // Ensure score is within reasonable bounds
    return Math.max(-100, Math.min(100, totalScore));
  }

  /**
   * Calculate score based on demographics and firmographics
   */
  calculateDemographicsScore(lead) {
    let score = 0;
    
    // Role in decision
    if (lead.role_in_decision && this.weights.role_in_decision[lead.role_in_decision]) {
      score += this.weights.role_in_decision[lead.role_in_decision];
    }
    
    // Company size
    if (lead.company_size) {
      if (lead.company_size > 500) {
        score += this.weights.company_size.large;
      } else if (lead.company_size >= 50) {
        score += this.weights.company_size.medium;
      } else {
        score += this.weights.company_size.small;
      }
    }
    
    // Industry
    if (lead.industry && this.weights.industry[lead.industry]) {
      score += this.weights.industry[lead.industry];
    }
    
    // Location (simplified - you can customize target regions)
    if (lead.location && (lead.location.city || lead.location.state || lead.location.country)) {
      // Example: consider certain regions as target regions
      const targetRegions = ['California', 'New York', 'Texas', 'Florida', 'London', 'Toronto'];
      const isTargetRegion = targetRegions.some(region => 
        lead.location.city?.includes(region) || 
        lead.location.state?.includes(region) || 
        lead.location.country?.includes(region)
      );
      score += isTargetRegion ? this.weights.location.target_region : this.weights.location.non_target;
    }
    
    return score;
  }

  /**
   * Calculate score based on lead source quality
   */
  calculateSourceQualityScore(lead) {
    if (lead.lead_source && this.weights.lead_source[lead.lead_source]) {
      return this.weights.lead_source[lead.lead_source];
    }
    return 0;
  }

  /**
   * Calculate score based on engagement and activity
   */
  calculateEngagementScore(lead) {
    let score = this.weights.base_score; // Base score for lead creation
    
    // Notes added by sales rep
    if (lead.notes && lead.notes.trim().length > 0) {
      score += this.weights.notes_added;
    }
    
    // Next follow-up scheduled
    if (lead.next_follow_up) {
      score += this.weights.follow_up_scheduled;
    }
    
    // Status updated to "Contacted"
    if (lead.status === 'Contacted') {
      score += this.weights.status_contacted;
    }
    
    return score;
  }

  /**
   * Calculate decay score based on time and activity
   */
  calculateDecayScore(lead) {
    let score = 0;
    
    // Check if no update in 30 days
    if (lead.updated_at) {
      const daysSinceUpdate = Math.floor((new Date() - new Date(lead.updated_at)) / (1000 * 60 * 60 * 24));
      if (daysSinceUpdate > 30) {
        score += this.weights.no_update_30_days;
      }
    }
    
    // Check if status is "Cold" or similar
    const coldStatuses = ['Cold', 'Lost', 'Rejected'];
    if (lead.status && coldStatuses.includes(lead.status)) {
      score += this.weights.status_cold;
    }
    
    return score;
  }

  /**
   * Get lead classification based on score
   */
  getLeadClassification(score) {
    for (const [classification, range] of Object.entries(this.scoreRanges)) {
      if (score >= range.min && score <= range.max) {
        return classification;
      }
    }
    return 'Unknown';
  }

  /**
   * Get detailed scoring breakdown for debugging/transparency
   */
  getScoringBreakdown(lead) {
    const breakdown = {
      demographics: this.calculateDemographicsScore(lead),
      sourceQuality: this.calculateSourceQualityScore(lead),
      engagement: this.calculateEngagementScore(lead),
      decay: this.calculateDecayScore(lead),
      total: 0
    };
    
    breakdown.total = breakdown.demographics + breakdown.sourceQuality + breakdown.engagement + breakdown.decay;
    
    return {
      ...breakdown,
      classification: this.getLeadClassification(breakdown.total),
      score: breakdown.total
    };
  }

  /**
   * Update lead score and return updated lead object
   */
  async updateLeadScore(lead) {
    const newScore = this.calculateLeadScore(lead);
    const classification = this.getLeadClassification(newScore);
    
    // Update the lead object
    lead.lead_score = newScore;
    
    // Add scoring metadata
    lead.scoring_metadata = {
      last_calculated: new Date(),
      classification: classification,
      breakdown: this.getScoringBreakdown(lead)
    };
    
    return lead;
  }

  /**
   * Batch update scores for multiple leads
   */
  async batchUpdateScores(leads) {
    const updatedLeads = [];
    
    for (const lead of leads) {
      const updatedLead = await this.updateLeadScore(lead);
      updatedLeads.push(updatedLead);
    }
    
    return updatedLeads;
  }

  /**
   * Get scoring recommendations for improving lead score
   */
  getScoringRecommendations(lead) {
    const recommendations = [];
    const currentScore = lead.lead_score || 0;
    
    // Check if lead needs follow-up
    if (!lead.next_follow_up) {
      recommendations.push({
        action: 'Schedule follow-up',
        potential_score_increase: this.weights.follow_up_scheduled,
        priority: 'high'
      });
    }
    
    // Check if notes are missing
    if (!lead.notes || lead.notes.trim().length === 0) {
      recommendations.push({
        action: 'Add sales notes',
        potential_score_increase: this.weights.notes_added,
        priority: 'medium'
      });
    }
    
    // Check if status should be updated
    if (lead.status === 'New') {
      recommendations.push({
        action: 'Update status to Contacted',
        potential_score_increase: this.weights.status_contacted,
        priority: 'high'
      });
    }
    
    // Check for decay issues
    if (lead.updated_at) {
      const daysSinceUpdate = Math.floor((new Date() - new Date(lead.updated_at)) / (1000 * 60 * 60 * 24));
      if (daysSinceUpdate > 30) {
        recommendations.push({
          action: 'Update lead information',
          potential_score_increase: Math.abs(this.weights.no_update_30_days),
          priority: 'high'
        });
      }
    }
    
    return recommendations;
  }
}

module.exports = LeadScoringService;

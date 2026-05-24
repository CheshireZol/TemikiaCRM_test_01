import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

const StatCard = ({ 
  label, 
  value, 
  icon: IconComponent, 
  trend, 
  trendDirection = 'up', 
  trendLabel = 'vs mes anterior',
  aiTheme = false,
  successTheme = false
}) => {
  return (
    <div className="kpi-card">
      <div className="kpi-info">
        <span className="kpi-label">{label}</span>
        <span className="kpi-value">{value}</span>
        
        {trend && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
            <span className={`kpi-trend ${trendDirection === 'up' ? 'positive' : 'neutral'}`}>
              {trendDirection === 'up' ? <ArrowUpRight size={14} /> : <Minus size={14} />}
              {trend}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{trendLabel}</span>
          </div>
        )}
      </div>

      <div className={`kpi-icon-wrapper ${aiTheme ? 'ai' : successTheme ? 'success' : ''}`}>
        <IconComponent size={20} />
      </div>
    </div>
  );
};

export default StatCard;

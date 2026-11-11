
import type { ReactNode, ButtonHTMLAttributes } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  LoaderCircle,
  Plus
} from 'lucide-react'

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}) {
  return (
    <button
      className={`btn btn-${variant} btn-${size} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Card({
  children,
  className = ''
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`card ${className}`}
    >
      {children}
    </motion.section>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="page-action">{action}</div>}
    </div>
  )
}

export function Badge({
  status,
  children
}: {
  status?: string
  children?: ReactNode
}) {
  const s = (status || String(children || '')).toLowerCase()

  const cls =
    s.includes('pass') ||
    s.includes('connected') ||
    s.includes('success')
      ? 'success'
      : s.includes('fail') ||
        s.includes('critical') ||
        s.includes('error')
        ? 'danger'
        : s.includes('warn') || s.includes('pending')
          ? 'warning'
          : 'info'

  return (
    <span className={`badge badge-${cls}`}>
      <span className="badge-dot" />
      {children || status}
    </span>
  )
}

export function MetricCard({
  label,
  value,
  change,
  icon: Icon,
  tone = 'purple'
}: {
  label: string
  value: string
  change?: string
  icon: any
  tone?: string
}) {
  return (
    <Card className="metric-card">
      <div className={`metric-icon ${tone}`}>
        <Icon size={19} />
      </div>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {change && <div className="metric-change">{change}</div>}
    </Card>
  )
}

export function EmptyState({
  title,
  description,
  action
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="empty-state">
      <Link
        to="/app/add-repository"
        className="empty-icon"
        title="Add repository"
        aria-label="Add repository"
      >
        <Plus size={22} />
      </Link>

      <h3>{title}</h3>
      <p>{description}</p>

      {action || (
        <Link to="/app/add-repository">
          <Button type="button">
            <Plus size={16} />
            Add repository
          </Button>
        </Link>
      )}
    </div>
  )
}

export function SectionTitle({
  title,
  action
}: {
  title: string
  action?: ReactNode
}) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {action}
    </div>
  )
}

export function StatusIcon({ status }: { status: string }) {
  if (status === 'PASS') {
    return <CheckCircle2 className="text-success" size={18} />
  }

  if (status === 'FAIL') {
    return <XCircle className="text-danger" size={18} />
  }

  if (status === 'WARNING') {
    return <AlertTriangle className="text-warning" size={18} />
  }

  return <Info size={18} />
}

export function DemoNotice() {
  return (
    <div className="demo-notice">
      <Info size={15} />
      Demo mode — displayed metrics are sample data, not live repository analysis.
    </div>
  )
}

export function LoadingButton({
  loading,
  children,
  ...props
}: any) {
  return (
    <Button {...props} disabled={loading || props.disabled}>
      {loading ? (
        <>
          <LoaderCircle className="spin" size={16} />
          Working…
        </>
      ) : (
        children
      )}
    </Button>
  )
}

export function LinkAction({ children }: { children: ReactNode }) {
  return (
    <span className="link-action">
      {children}
      <ArrowUpRight size={14} />
    </span>
  )
}

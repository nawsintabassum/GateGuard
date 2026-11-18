
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Activity, AlertCircle, ArrowDownRight, ArrowRight, ArrowUpRight,
  Bell, BookOpen, Bot, Check, CheckCircle2, ChevronDown, CircleDot,
  Clock3, Code2, Download, ExternalLink, FileChartColumn, Filter,
  GitBranch, Github, History, KeyRound, LockKeyhole, Plus, RefreshCw,
  Search, Settings, ShieldAlert, ShieldCheck, SlidersHorizontal,
  Sparkles, TestTube2, Trash2, TrendingUp, UserRound, X, Zap
} from 'lucide-react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'
import { toast } from 'sonner'
import {
  api, getCached, clearSession, demoHistory, demoProjects, DEMO_MODE,
  getAccessToken, getStoredUser, saveSession
} from '../lib/api'
import {
  Badge, Button, Card, DemoNotice, EmptyState, MetricCard,
  PageHeader, SectionTitle, StatusIcon
} from '../components/ui'

const trend = [
  { run: 'Run 1', score: 65, coverage: 64 },
  { run: 'Run 2', score: 71, coverage: 69 },
  { run: 'Run 3', score: 68, coverage: 72 },
  { run: 'Run 4', score: 79, coverage: 75 },
  { run: 'Run 5', score: 83, coverage: 78 },
  { run: 'Run 6', score: 88, coverage: 82 },
  { run: 'Run 7', score: 92, coverage: 86 }
]

const bars = [
  { name: 'Statements', value: 86 },
  { name: 'Branches', value: 78 },
  { name: 'Functions', value: 91 },
  { name: 'Lines', value: 84 }
]

const ruleDefaults = [
  {
    id: 'coverage',
    title: 'Minimum test coverage',
    desc: 'Required statement coverage across the project.',
    value: 80,
    unit: '%',
    enabled: true
  },
  {
    id: 'passrate',
    title: 'Minimum test pass rate',
    desc: 'Percentage of tests that must pass.',
    value: 95,
    unit: '%',
    enabled: true
  },
  {
    id: 'eslint',
    title: 'Maximum ESLint errors',
    desc: 'Maximum static analysis issues allowed.',
    value: 0,
    unit: 'errors',
    enabled: true
  },
  {
    id: 'critical',
    title: 'Critical vulnerabilities',
    desc: 'Maximum critical dependency vulnerabilities.',
    value: 0,
    unit: 'issues',
    enabled: true
  },
  {
    id: 'high',
    title: 'High vulnerabilities',
    desc: 'Maximum high severity dependency vulnerabilities.',
    value: 0,
    unit: 'issues',
    enabled: true
  }
]

function QualityChart({ data = trend }: { data?: typeof trend }) {
  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height={245}>
        <AreaChart
          data={data}
          margin={{ top: 12, right: 8, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="qualityFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#756cff" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#756cff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#24314a" strokeDasharray="4 5" vertical={false} />
          <XAxis
            dataKey="run"
            tick={{ fill: '#74829b', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: '#74829b', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: '#111a30',
              border: '1px solid #2b3954',
              borderRadius: 10,
              color: '#fff'
            }}
          />
          <Area
            type="monotone"
            dataKey="score"
            name="Quality score"
            stroke="#8b83ff"
            strokeWidth={2.5}
            fill="url(#qualityFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function CoverageChart() {
  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={bars} margin={{ top: 10, right: 0, left: -22, bottom: 0 }}>
          <CartesianGrid stroke="#24314a" strokeDasharray="4 5" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: '#74829b', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: '#74829b', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: '#111a30',
              border: '1px solid #2b3954',
              borderRadius: 10
            }}
          />
          <Bar
            dataKey="value"
            name="Coverage"
            fill="#746bff"
            radius={[5, 5, 0, 0]}
            barSize={25}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

type ProjectRow = {
  id: string
  name: string
  repo: string
  branch: string
  score: number
  coverage: number
  status: string
  updated: string
  language: string
  ownerId?: string
}

function mapProject(project: any): ProjectRow {
  return {
    id: String(project._id || project.id),
    name: project.name,
    repo: project.repoFullName || project.repo || '',
    branch: project.defaultBranch || project.branch || 'main',
    score: Number(project.latestScore || 0),
    coverage: Number(project.latestCoverage || 0),
    status: project.latestStatus || 'WARNING',
    updated: project.lastAnalysisAt
      ? new Date(project.lastAnalysisAt).toLocaleString()
      : 'Not analyzed yet',
    language: project.language || 'Unknown',
    ownerId: String(project.owner?._id || project.owner || '')
  }
}

function ProjectTable({
  rows,
  onDelete
}: {
  rows: ProjectRow[]
  onDelete?: (project: ProjectRow) => void
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>PROJECT</th>
            <th>QUALITY SCORE</th>
            <th>COVERAGE</th>
            <th>LAST ANALYSIS</th>
            <th>STATUS</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map(p => (
            <tr key={p.id}>
              <td>
                <Link to={`/app/projects/${p.id}`} className="project-cell">
                  <span className="repo-icon"><Github size={17} /></span>
                  <span>
                    <b>{p.name}</b>
                    <small>{p.repo}</small>
                  </span>
                </Link>
              </td>
              <td><b>{p.score}/100</b></td>
              <td>{p.coverage}%</td>
              <td className="muted-cell">{p.updated}</td>
              <td><Badge status={p.status}>{p.status}</Badge></td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Link className="table-arrow" to={`/app/projects/${p.id}`}>
                    <ArrowUpRight size={16} />
                  </Link>
                  {onDelete && (
                    <button
                      type="button"
                      title="Delete repository"
                      aria-label={`Delete ${p.name}`}
                      onClick={() => onDelete(p)}
                      style={{
                        background: 'transparent',
                        border: 0,
                        color: '#ff7e8b',
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Dashboard() {
  const [projects, setProjects] = useState<ProjectRow[]>(
    DEMO_MODE ? demoProjects : []
  )
  const [analyses, setAnalyses] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  const [ciToken, setCiToken] = useState('')
  const [tokenBusy, setTokenBusy] = useState(false)
  const [loading, setLoading] = useState(!DEMO_MODE)

  useEffect(() => {
    if (DEMO_MODE) return

    let active = true
    let projectItems: any[] = []
    let analysisItems: any[] = []

    const updateProjects = () => {
      const latestByProject = new Map<string, any>()

      for (const item of analysisItems) {
        const projectId = String(item.project?._id || item.project)
        if (!latestByProject.has(projectId)) {
          latestByProject.set(projectId, item)
        }
      }

      setProjects(
        projectItems.map((item: any) => {
          const latest = latestByProject.get(String(item._id))
          return {
            ...mapProject(item),
            coverage: Number(latest?.metrics?.coverage?.lines || 0),
            score: Number(latest?.score || item.latestScore || 0),
            status: latest?.status || item.latestStatus || 'WARNING',
            updated: latest?.createdAt
              ? new Date(latest.createdAt).toLocaleString()
              : 'Not analyzed yet'
          }
        })
      )
    }

    getCached<{ projects: any[] }>('/projects')
      .then(({ data }) => {
        if (!active) return
        projectItems = data.projects
        updateProjects()
      })
      .catch(() => {
        if (active) toast.error('Could not load projects from GateGuard API')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    getCached<{ analyses: any[] }>('/analyses?limit=10')
      .then(({ data }) => {
        if (!active) return
        analysisItems = data.analyses
        setAnalyses(analysisItems)
        updateProjects()
      })
      .catch(() => {
        if (active) toast.error('Could not load analyses from GateGuard API')
      })

    return () => {
      active = false
    }
  }, [])

  const latest = analyses[0]
  const metrics = analyses.map(a => a.metrics || {})

  const avgScore = analyses.length
    ? Math.round(
        analyses.reduce((n, a) => n + Number(a.score || 0), 0) / analyses.length
      )
    : 0

  const coverage = metrics.length
    ? Math.round(
        metrics.reduce((n, m) => n + Number(m.coverage?.lines || 0), 0) /
          metrics.length
      )
    : 0

  const passed = metrics.reduce((n, m) => n + Number(m.tests?.passed || 0), 0)
  const issues = analyses.reduce((n, a) => n + (a.findings?.length || 0), 0)
  const vulns = metrics.reduce(
    (n, m) =>
      n +
      Number(m.security?.critical || 0) +
      Number(m.security?.high || 0),
    0
  )

  const shownProjects = DEMO_MODE ? demoProjects : projects

  return (
    <>
      {DEMO_MODE && <DemoNotice />}

      <PageHeader
        eyebrow="OVERVIEW"
        title="Engineering quality overview"
        description="A unified view of repository health, delivery confidence, test coverage and security posture."
        action={
          <Link to="/app/add-repository">
            <Button><Plus size={17} /> Add repository</Button>
          </Link>
        }
      />

      {loading ? (
        <Card><p className="card-description">Loading workspace analytics…</p></Card>
      ) : (
        <>
          <div className="metric-grid">
            <MetricCard
              label="Total projects"
              value={String(shownProjects.length).padStart(2, '0')}
              change="Repositories in your workspace"
              icon={Github}
            />
            <MetricCard
              label="Average quality score"
              value={DEMO_MODE ? '92/100' : `${avgScore}/100`}
              change={analyses.length ? `${analyses.length} recent analyses` : 'No analysis data yet'}
              icon={ShieldCheck}
              tone="green"
            />
            <MetricCard
              label="Test coverage"
              value={DEMO_MODE ? '86%' : `${coverage}%`}
              change="Average line coverage"
              icon={TestTube2}
              tone="cyan"
            />
            <MetricCard
              label="Passed tests"
              value={DEMO_MODE ? '248' : String(passed)}
              change="Across recent analyses"
              icon={CheckCircle2}
              tone="green"
            />
            <MetricCard
              label="Code findings"
              value={DEMO_MODE ? '12' : String(issues)}
              change="Findings in recent runs"
              icon={Code2}
              tone="amber"
            />
            <MetricCard
              label="High / critical risks"
              value={DEMO_MODE ? '02' : String(vulns)}
              change="Dependency vulnerabilities"
              icon={LockKeyhole}
              tone="red"
            />
          </div>

          <div className="dashboard-grid">
            <Card className="chart-card">
              <SectionTitle title="Quality trend" />
              <div className="chart-legend">
                <span><i className="legend-purple" /> Quality score</span>
              </div>
              <QualityChart
                data={
                  DEMO_MODE
                    ? trend
                    : analyses.slice().reverse().map((a: any) => ({
                        run: new Date(a.createdAt).toLocaleDateString(),
                        score: Number(a.score || 0),
                        coverage: Number(a.metrics?.coverage?.lines || 0)
                      }))
                }
              />
            </Card>

            <Card className="gate-card">
              <SectionTitle
                title="Latest quality gate"
                action={
                  latest ? (
                    <Link to={`/app/analysis/${latest._id}`} className="text-link">
                      View report <ArrowUpRight size={14} />
                    </Link>
                  ) : null
                }
              />

              {latest ? (
                <div className="gate-score">
                  <div className="score-ring">
                    <div><b>{latest.score}</b><small>/100</small></div>
                  </div>
                  <div>
                    <Badge status={latest.status}>{latest.status}</Badge>
                    <h3>{latest.status === 'PASS' ? 'Gate passed' : 'Review required'}</h3>
                    <p>{latest.project?.name || 'Latest repository'} · {latest.branch || 'default branch'}</p>
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <h3>No analysis submitted yet</h3>
                  <p>Connect a repository and run the GateGuard GitHub Actions workflow to see real results.</p>
                  <Link to="/app/add-repository">
                    Add your first repository <ArrowRight size={14} />
                  </Link>
                </div>
              )}

              <div className="gate-checks">
                <div>
                  <CheckCircle2 size={16} /> Latest quality score
                  <b>{latest ? `${latest.score}/100` : '—'}</b>
                </div>
                <div>
                  <CheckCircle2 size={16} /> Test coverage
                  <b>{latest ? `${latest.metrics?.coverage?.lines ?? 0}%` : '—'}</b>
                </div>
                <div>
                  <LockKeyhole size={16} /> Critical vulnerabilities
                  <b>{latest ? latest.metrics?.security?.critical ?? 0 : '—'}</b>
                </div>
              </div>
            </Card>
          </div>

          <div className="dashboard-grid lower-grid">
            <Card>
              <SectionTitle
                title="Project overview"
                action={
                  <Link to="/app/projects" className="text-link">
                    All projects <ArrowUpRight size={14} />
                  </Link>
                }
              />
              <ProjectTable rows={shownProjects} />
            </Card>

            <Card>
              <SectionTitle
                title="Quality insights"
                action={<span className="ai-label"><Sparkles size={13} /> FINDINGS</span>}
              />
              {latest?.findings?.length ? (
                latest.findings.slice(0, 2).map((finding: any, i: number) => (
                  <div className="recommendation" key={`${finding.title}-${i}`}>
                    <div className="recommendation-icon"><Bot size={19} /></div>
                    <div>
                      <Badge status={finding.severity === 'critical' || finding.severity === 'high' ? 'danger' : 'warning'}>
                        {finding.severity}
                      </Badge>
                      <h4>{finding.title}</h4>
                      <p>{finding.recommendation || finding.message || 'Review this finding and add a regression test.'}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="recommendation">
                  <div className="recommendation-icon"><Bot size={19} /></div>
                  <div>
                    <h4>{DEMO_MODE ? 'Sample recommendation' : 'No findings available'}</h4>
                    <p>
                      {DEMO_MODE
                        ? 'Connect the API to replace sample insights with actual analysis findings.'
                        : 'Run a repository analysis to receive evidence-based recommendations.'}
                    </p>
                  </div>
                </div>
              )}
            </Card>
          </div>

          <Card className="activity-card">
            <SectionTitle
              title="Recent activity"
              action={
                <Link to="/app/history" className="text-link">
                  View history <ArrowUpRight size={14} />
                </Link>
              }
            />
            <div className="activity-list">
              {(DEMO_MODE ? demoHistory : analyses).slice(0, 4).map((a: any) => {
                const status = a.status
                const id = a._id || a.id
                const project = a.project?.name || a.project
                const date = a.createdAt
                  ? new Date(a.createdAt).toLocaleString()
                  : a.date

                return (
                  <div className="activity-row" key={id}>
                    <div className={`activity-icon ${String(status).toLowerCase()}`}>
                      <StatusIcon status={status} />
                    </div>
                    <div>
                      <b>{project} analysis completed</b>
                      <small>{id} · {date}</small>
                    </div>
                    <div className="activity-right">
                      <Badge status={status}>{status}</Badge>
                      <b>{a.score}/100</b>
                    </div>
                  </div>
                )
              })}

              {!DEMO_MODE && analyses.length === 0 && (
                <p className="card-description">No analysis history yet.</p>
              )}
            </div>
          </Card>
        </>
      )}
    </>
  )
}

export function Projects() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All status')
  const [view, setView] = useState('table')
  const [rows, setRows] = useState<ProjectRow[]>(DEMO_MODE ? demoProjects : [])
  const [loading, setLoading] = useState(!DEMO_MODE)

  useEffect(() => {
    if (DEMO_MODE) return

    let active = true

    getCached<{ projects: any[] }>('/projects')
      .then(({ data }) => {
        if (active) setRows(data.projects.map(mapProject))
      })
      .catch(() => toast.error('Could not load projects from GateGuard API'))
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const handleDelete = async (project: ProjectRow) => {
    if (DEMO_MODE) {
      toast.error('Deletion is unavailable in demo mode')
      return
    }

    const confirmed = window.confirm(
      `Delete "${project.name}" from GateGuard? Its analysis history and quality rules will also be deleted. The GitHub repository itself will NOT be deleted.`
    )

    if (!confirmed) return

    try {
      await api.delete(`/projects/${project.id}`)
      setRows(current => current.filter(row => row.id !== project.id))
      toast.success('Repository deleted successfully')
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
        'Could not delete repository. Please try again.'
      )
    }
  }

  const filtered = useMemo(
    () =>
      rows.filter(
        p =>
          (p.name + p.repo).toLowerCase().includes(query.toLowerCase()) &&
          (status === 'All status' || p.status === status)
      ),
    [rows, query, status]
  )

  return (
    <>
      {DEMO_MODE && <DemoNotice />}

      <PageHeader
        eyebrow="WORKSPACE"
        title="Projects"
        description="Manage repositories and monitor their software quality."
        action={
          <Link to="/app/add-repository">
            <Button><Plus size={17} /> Add repository</Button>
          </Link>
        }
      />

      <Card>
        <div className="toolbar">
          <label className="search-field">
            <Search size={16} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search projects or repositories…"
            />
          </label>

          <select
            className="select-control"
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            <option>All status</option>
            <option>PASS</option>
            <option>FAIL</option>
            <option>WARNING</option>
          </select>

          <div className="view-switch">
            <button
              className={view === 'table' ? 'selected' : ''}
              onClick={() => setView('table')}
            >
              Table
            </button>
            <button
              className={view === 'grid' ? 'selected' : ''}
              onClick={() => setView('grid')}
            >
              Grid
            </button>
          </div>
        </div>

        {loading ? (
          <p className="card-description">Loading projects…</p>
        ) : view === 'table' ? (
          <ProjectTable rows={filtered} onDelete={handleDelete} />
        ) : (
          <div className="project-grid">
            {filtered.map(p => (
              <Card key={p.id} className="project-card">
                <div className="project-card-head">
                  <div className="repo-icon"><Github size={18} /></div>
                  <Badge status={p.status}>{p.status}</Badge>
                </div>
                <h3>{p.name}</h3>
                <p>{p.repo}</p>
                <div className="project-stats">
                  <div><small>Quality score</small><b>{p.score}/100</b></div>
                  <div><small>Coverage</small><b>{p.coverage}%</b></div>
                </div>
                <div className="project-card-foot">
                  <span><GitBranch size={13} />{p.branch}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Link to={`/app/projects/${p.id}`}>
                      View project <ArrowRight size={14} />
                    </Link>
                    <button
                      type="button"
                      title="Delete repository"
                      aria-label={`Delete ${p.name}`}
                      onClick={() => handleDelete(p)}
                      style={{
                        background: 'transparent',
                        border: 0,
                        color: '#ff7e8b',
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <EmptyState
            title="No projects found"
            description="Add a GitHub repository or change your search filters."
          />
        )}

        <div className="table-foot">
          Showing {filtered.length} of {rows.length} projects
          <span>{DEMO_MODE ? 'Sample data' : 'Live workspace data'}</span>
        </div>
      </Card>
    </>
  )
}

export function AddRepository() {
  const [step, setStep] = useState(1)
  const [url, setUrl] = useState('')
  const [branch, setBranch] = useState('main')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  // Accept normal GitHub repository URLs and URLs ending in .git.
  const connect = () => {
    try {
      const input = url.trim().replace(/\.git$/i, '').replace(/\/+$/, '')
      const parsed = new URL(input)

      if (
        parsed.protocol !== 'https:' ||
        parsed.hostname !== 'github.com'
      ) {
        throw new Error('Invalid GitHub URL')
      }

      const parts = parsed.pathname.split('/').filter(Boolean)

      if (
        parts.length !== 2 ||
        !/^[A-Za-z0-9_.-]+$/.test(parts[0]) ||
        !/^[A-Za-z0-9_.-]+$/.test(parts[1])
      ) {
        throw new Error('Invalid repository URL')
      }

      const owner = parts[0]
      const repo = parts[1]
      const cleanUrl = `https://github.com/${owner}/${repo}`

      setUrl(cleanUrl)
      setName(repo)
      setStep(2)
    } catch {
      toast.error('Enter a valid GitHub repository URL')
    }
  }

  const connectGithub = async () => {
    try {
      const { data } = await api.get<{ authorizationUrl: string }>('/github/connect')
      window.location.assign(data.authorizationUrl)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not start GitHub connection')
    }
  }

  const finish = async () => {
    if (!name.trim() || !branch.trim()) {
      toast.error('Project name and branch are required')
      return
    }

    if (DEMO_MODE) {
      toast.error('Demo mode is enabled. Configure the backend API first.')
      return
    }

    setBusy(true)

    try {
      const { data } = await api.post('/projects', {
        name: name.trim(),
        repoUrl: url.trim(),
        branch: branch.trim()
      })

      if (data.ciToken) {
        try {
          await navigator.clipboard.writeText(data.ciToken)

          toast.success('Repository added successfully', {
            description: 'CI token copied. Save it as GATEGUARD_CI_TOKEN in GitHub Actions secrets.'
          })
        } catch {
          window.prompt(
            'Copy this CI token and save it as GATEGUARD_CI_TOKEN:',
            data.ciToken
          )

          toast.success('Repository added successfully')
        }
      } else {
        toast.success('Repository added successfully')
      }

      navigate('/app/projects')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not add repository')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="PROJECTS / NEW"
        title="Add a repository"
        description="Connect a GitHub repository to start monitoring its quality."
      />

      <div className="wizard">
        <div className={`wizard-step ${step >= 1 ? 'active' : ''}`}>
          <span>01</span>
          <div><b>Connect repository</b><small>Choose a source</small></div>
        </div>
        <div className="wizard-line" />
        <div className={`wizard-step ${step >= 2 ? 'active' : ''}`}>
          <span>02</span>
          <div><b>Configure project</b><small>Confirm details</small></div>
        </div>
      </div>

      <div className="add-repo-layout">
        <Card className="form-card">
          {step === 1 ? (
            <>
              <div className="integration-hero">
                <div className="github-big"><Github size={29} /></div>
                <div>
                  <h2>Connect with GitHub</h2>
                  <p>Authorize GateGuard to access repositories you choose.</p>
                </div>
                <Badge status={DEMO_MODE ? 'warning' : 'success'}>
                  {DEMO_MODE ? 'Demo mode' : 'API connected'}
                </Badge>
              </div>

              <div className="github-connect-box">
                <div className="github-connect-icon"><Github size={24} /></div>
                <div>
                  <b>GitHub account</b>
                  <small>Connect your account to browse repositories.</small>
                </div>
                <Button variant="secondary" onClick={connectGithub}>
                  Connect GitHub <ArrowUpRight size={15} />
                </Button>
              </div>

              <div className="form-divider">
                <span>OR ADD A REPOSITORY BY URL</span>
              </div>

              <label className="field">
                <span>Repository URL</span>
                <input
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://github.com/owner/repository"
                />
              </label>

              <div className="field-hint">
                The repository must be accessible to the GitHub account connected to the workflow.
              </div>

              <Button onClick={connect} disabled={!url.trim()}>
                Continue <ArrowRight size={16} />
              </Button>
            </>
          ) : (
            <>
              <div className="success-panel">
                <CheckCircle2 size={28} />
                <div>
                  <b>Repository details ready</b>
                  <small>Review the project settings before adding it.</small>
                </div>
              </div>

              <label className="field">
                <span>Project name</span>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </label>

              <label className="field">
                <span>Repository URL</span>
                <input value={url} readOnly />
              </label>

              <label className="field">
                <span>Default branch</span>
                <input
                  value={branch}
                  onChange={e => setBranch(e.target.value)}
                  maxLength={120}
                />
              </label>

              <div className="repo-preview">
                <Github size={20} />
                <div>
                  <b>{name || 'Repository name'}</b>
                  <small>{url}</small>
                </div>
                <Badge status="info">GitHub</Badge>
              </div>

              <div className="form-actions">
                <Button variant="secondary" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  onClick={finish}
                  disabled={busy || !name.trim() || !branch.trim()}
                >
                  {busy ? 'Saving…' : 'Add repository'} <Check size={16} />
                </Button>
              </div>
            </>
          )}
        </Card>

        <Card className="side-info-card">
          <div className="side-info-icon"><ShieldCheck size={21} /></div>
          <h3>What happens next?</h3>
          <ul>
            <li><CheckCircle2 size={16} /> Repository metadata is saved to your workspace.</li>
            <li><CheckCircle2 size={16} /> Configure your GitHub Actions secrets.</li>
            <li><CheckCircle2 size={16} /> Run the first isolated quality analysis.</li>
          </ul>
          <div className="security-note">
            <LockKeyhole size={16} />
            <span>Never paste access tokens here. GitHub credentials are handled through server-side OAuth.</span>
          </div>
        </Card>
      </div>
    </>
  )
}

export function ProjectDetails() {
  const { id = '' } = useParams()

  const [project, setProject] = useState<ProjectRow | null>(
    DEMO_MODE ? (demoProjects.find(p => p.id === id) || demoProjects[0]) : null
  )
  const [analyses, setAnalyses] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  const [ciToken, setCiToken] = useState('')
  const [tokenBusy, setTokenBusy] = useState(false)
  const [loading, setLoading] = useState(!DEMO_MODE)

  useEffect(() => {
    if (DEMO_MODE) {
      setProject(demoProjects.find(p => p.id === id) || null)

      try {
        const saved = JSON.parse(
          localStorage.getItem(`gateguard.demo.analyses.${id}`) || '[]'
        )
        setAnalyses(saved)
      } catch {
        setAnalyses([])
      }

      return
    }

    let active = true

    Promise.all([
      getCached<{ project: any }>(`/projects/${id}`),
      getCached<{ analyses: any[] }>(
        `/analyses?projectId=${encodeURIComponent(id)}&limit=10`
      ),
      getCached<any>(`/analyses/analytics/${encodeURIComponent(id)}`)
    ])
      .then(([p, a, trendData]) => {
        if (!active) return

        const latest = a.data.analyses[0]

        setProject({
          ...mapProject(p.data.project),
          score: Number(latest?.score || p.data.project.latestScore || 0),
          coverage: Number(latest?.metrics?.coverage?.lines || 0),
          status: latest?.status || p.data.project.latestStatus || 'WARNING'
        })

        setAnalyses(a.data.analyses)
        setAnalytics(trendData.data)
      })
      .catch(() => toast.error('Could not load project details'))
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [id])

  const copyText = async (value: string, label: string) => {
    try { await navigator.clipboard.writeText(value); toast.success(`${label} copied`) }
    catch { window.prompt(`Copy ${label}:`, value) }
  }

  const regenerateToken = async () => {
    if (DEMO_MODE) { toast.error('CI token management is unavailable in demo mode'); return }
    if (!window.confirm('Regenerate this project CI token? The previous token will stop working immediately.')) return
    setTokenBusy(true)
    try {
      const { data } = await api.post(`/projects/${id}/ci-token/regenerate`)
      setCiToken(data.ciToken || '')
      toast.success('New CI token generated', { description: 'Copy it now and update the GATEGUARD_CI_TOKEN GitHub Actions secret.' })
    } catch (error: any) { toast.error(error.response?.data?.message || 'Could not regenerate CI token') }
    finally { setTokenBusy(false) }
  }

  const runAnalysis = () => {
    if (DEMO_MODE) {
      const item = {
        _id: `demo-${Date.now()}`,
        branch: project?.branch || 'main',
        score: 84,
        status: 'PASS',
        createdAt: new Date().toISOString(),
        demo: true
      }

      const next = [item, ...analyses]

      setAnalyses(next)
      localStorage.setItem(
        `gateguard.demo.analyses.${id}`,
        JSON.stringify(next)
      )

      toast.success('Offline demo analysis added', {
        description: 'Sample result only — no repository code was scanned.'
      })

      return
    }

    const repo = project?.repo || ''
    const [owner, name] = repo.split('/')

    if (!owner || !name) {
      toast.error('Repository name is unavailable. Open the repository settings and verify its GitHub owner/name.')
      return
    }

    window.open(
      `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/actions/workflows/gateguard.yml`,
      '_blank',
      'noopener,noreferrer'
    )

    toast.info('GitHub Actions opened', {
      description: 'Run the GateGuard Quality Gate workflow from the Actions tab. The live result appears after CI submits it.'
    })
  }

  if (loading) {
    return <Card><p className="card-description">Loading project details…</p></Card>
  }

  if (!project) {
    return (
      <EmptyState
        title="Project not found"
        description="This project may have been removed or you may not have access."
      />
    )
  }

  return (
    <>
      {DEMO_MODE && <DemoNotice />}

      <div className="breadcrumbs">
        <Link to="/app/projects">Projects</Link>
        <span>/</span>
        {project.name}
      </div>

      <PageHeader
        eyebrow="PROJECT OVERVIEW"
        title={project.name}
        description={`${project.repo} · ${project.language}`}
        action={
          <Button onClick={runAnalysis}>
            <Zap size={16} />
            {DEMO_MODE ? 'Run offline demo' : 'Run analysis'}
          </Button>
        }
      />

      <div className="project-summary">
        <div className="project-summary-main">
          <div className="repo-icon large"><Github size={23} /></div>
          <div>
            <h3>{project.name}</h3>
            <p>
              {project.repo} <span>·</span> <GitBranch size={13} /> {project.branch}
            </p>
          </div>
          <Badge status={project.status}>{project.status}</Badge>
        </div>

        <div className="summary-metrics">
          <div><small>Quality score</small><b>{project.score}/100</b></div>
          <div><small>Coverage</small><b>{project.coverage}%</b></div>
          <div><small>Last analysis</small><b>{project.updated}</b></div>
        </div>
      </div>

      <div className="tabs">
        <button className="active">Overview</button>
        <Link to="/app/rules">Quality rules</Link>
        <Link to="/app/history">All analyses</Link>
      </div>

      <Card className="project-credentials-card">
        <SectionTitle title="Project & CI credentials" />
        <p className="card-description">Use the Project ID in your CI workflow. CI tokens are stored as hashes and cannot be retrieved later.</p>
        <div className="credential-row"><div><small>PROJECT ID</small><code>{id}</code></div><Button variant="secondary" onClick={() => copyText(id, 'Project ID')}><Download size={14}/> Copy ID</Button></div>
        {project.ownerId === getStoredUser()?.id ? <><div className="credential-row"><div><small>CI TOKEN</small><code>{ciToken ? ciToken : '••••••••••••••••••••••••••••••••'}</code></div><Button onClick={regenerateToken} disabled={tokenBusy}><RefreshCw size={14}/> {tokenBusy ? 'Generating…' : 'Regenerate token'}</Button></div>{ciToken && <div className="token-reveal"><p>New token is visible only in this session. Save it in GitHub → Settings → Secrets and variables → Actions as <b>GATEGUARD_CI_TOKEN</b>.</p><Button variant="secondary" onClick={() => copyText(ciToken, 'CI token')}><KeyRound size={14}/> Copy token</Button></div>}</> : <p className="card-description">CI token controls are available only to the project owner. Ask the owner to generate and store the repository secret.</p>}
      </Card>

      <div className="dashboard-grid">
        <Card>
          <SectionTitle title="Quality trend · last 7 days" />
          {analytics?.runs?.length ? <>
            <div className="summary-metrics"><div><small>Score change</small><b>{analytics.summary.scoreChange > 0 ? '+' : ''}{analytics.summary.scoreChange ?? '—'}</b></div><div><small>Coverage change</small><b>{analytics.summary.coverageChange > 0 ? '+' : ''}{analytics.summary.coverageChange ?? '—'}{analytics.summary.coverageChange === null ? '' : '%'}</b></div><div><small>Analyses</small><b>{analytics.summary.analyses}</b></div></div>
            <QualityChart data={analytics.runs.map((r: any) => ({ run: new Date(r.date).toLocaleDateString(), score: r.score, coverage: r.coverage }))}/>
          </> : <p className="card-description">Seven-day trends appear when CI submits dated analysis results.</p>}
        </Card>

        <Card>
          <SectionTitle title="Coverage breakdown" />
          {analyses[0]?.metrics?.coverage ? (
            <div className="security-summary">
              <div><b>{analyses[0].metrics.coverage.statements}%</b><small>Statements</small></div>
              <div><b>{analyses[0].metrics.coverage.branches}%</b><small>Branches</small></div>
              <div><b>{analyses[0].metrics.coverage.functions}%</b><small>Functions</small></div>
              <div><b>{analyses[0].metrics.coverage.lines}%</b><small>Lines</small></div>
            </div>
          ) : (
            <p className="card-description">
              No coverage data has been submitted for this project yet.
            </p>
          )}
        </Card>
      </div>

      <div className="dashboard-grid">
        <Card>
          <SectionTitle title="Quality debt tracker" />
          {(() => {
            const counts = new Map<string, { count: number; severity: string; file?: string; title: string }>()
            analyses.forEach((a: any) => (a.findings || []).forEach((f: any) => {
              const key = `${f.title}|${f.file || ''}`
              const old = counts.get(key) || { count: 0, severity: f.severity || 'info', file: f.file, title: f.title }
              old.count += 1; counts.set(key, old)
            }))
            const debt = [...counts.values()].filter(v => v.count > 1).sort((a,b) => b.count-a.count).slice(0,5)
            return debt.length ? debt.map((item, i) => <div className="activity-row" key={`${item.title}-${i}`}><div className="activity-icon fail"><AlertCircle size={15}/></div><div><b>{item.title}</b><small>{item.file || 'File not supplied'} · repeated in {item.count} analyses</small></div><Badge status={item.severity}>{item.severity}</Badge></div>) : <p className="card-description">Repeated issues across the last 10 analyses will appear here. Findings are grouped by title and file as a technical-debt signal.</p>
          })()}
        </Card>
        <Card>
          <SectionTitle title="Smart quality recommendations" />
          {(() => {
            const latest = analyses[0]
            const suggestions = (latest?.findings || []).slice(0, 5).map((f: any) => ({ title: f.title, detail: f.recommendation || f.message || 'Review this finding', severity: f.severity }))
            if (latest?.metrics?.coverage?.lines < 80) suggestions.unshift({ title: 'Improve line coverage', detail: `Current coverage is ${latest.metrics.coverage.lines}%. Add tests around untested branches and critical paths.`, severity: 'medium' })
            if (latest?.metrics?.tests?.failed > 0) suggestions.unshift({ title: 'Resolve failed tests', detail: `${latest.metrics.tests.failed} tests failed in the latest analysis. Review the AI failure explanation.`, severity: 'high' })
            return suggestions.length ? suggestions.slice(0,5).map((item: any, i: number) => <div className="recommendation" key={`${item.title}-${i}`}><div className="recommendation-icon"><Sparkles size={16}/></div><div><h4>{item.title}</h4><p>{item.detail}</p></div></div>) : <p className="card-description">Recommendations will be generated from the latest verified analysis findings.</p>
          })()}
        </Card>
      </div>

      <Card>
        <SectionTitle title="Dependency security findings" />
        {(() => {
          const dependencies = (analyses[0]?.findings || []).filter((f: any) => f.package)
          return dependencies.length ? <div className="table-scroll"><table><thead><tr><th>SEVERITY</th><th>DEPENDENCY</th><th>AFFECTED VERSION</th><th>FIXED VERSION</th><th>RECOMMENDATION</th></tr></thead><tbody>{dependencies.map((f: any, i: number) => <tr key={`${f.package}-${i}`}><td><Badge status={f.severity}>{f.severity}</Badge></td><td>{f.package}</td><td>{f.affectedVersion || 'Not supplied'}</td><td>{f.fixedVersion || 'Not supplied'}</td><td>{f.recommendation || 'Review advisory'}</td></tr>)}</tbody></table></div> : <p className="card-description">Dependency-level details appear when the CI dependency audit reports package findings.</p>
        })()}
      </Card>

      <Card>
        <SectionTitle title="Flaky test signals" />
        {analytics?.flakyTests?.length ? analytics.flakyTests.map((test: any) => <div className="activity-row" key={test.name}><div className="activity-icon fail"><TestTube2 size={15}/></div><div><b>{test.name}</b><small>{test.file || 'File not supplied'} · {test.passedRuns} pass / {test.failedRuns} fail</small></div><Badge status="WARNING">FLAKY</Badge></div>) : <p className="card-description">No flaky tests detected from submitted test-case history. To enable detection, include testCases in the CI result payload with each test's name and passed/failed status.</p>}
      </Card>

      <Card>
        <SectionTitle
          title="Recent analyses"
          action={
            <Link to="/app/history" className="text-link">
              All history <ArrowUpRight size={14} />
            </Link>
          }
        />

        {analyses.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>ANALYSIS</th>
                  <th>BRANCH</th>
                  <th>SCORE</th>
                  <th>STATUS</th>
                  <th>DATE</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {analyses.map(a => (
                  <tr key={a._id}>
                    <td>
                      {a._id}
                      {a.demo && <small className="table-sub">OFFLINE SAMPLE</small>}
                    </td>
                    <td>{a.branch}</td>
                    <td><b>{a.score}/100</b></td>
                    <td><Badge status={a.status}>{a.status}</Badge></td>
                    <td>{new Date(a.createdAt).toLocaleString()}</td>
                    <td>
                      <Link className="table-arrow" to={`/app/analysis/${a._id}`}>
                        <ArrowUpRight size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No analyses yet"
            description="Configure the GateGuard GitHub Actions workflow and submit the first analysis."
          />
        )}
      </Card>
    </>
  )
}

export function AnalysisResults() {
  const { id = '' } = useParams()

  const [analysis, setAnalysis] = useState<any>(null)
  const [loading, setLoading] = useState(!DEMO_MODE)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (DEMO_MODE) return

    let active = true

    getCached<{ analysis: any }>(`/analyses/${id}`)
      .then(({ data }) => {
        if (active) setAnalysis(data.analysis)
      })
      .catch(() => toast.error('Could not load analysis details'))
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [id])

  const exportPdf = async () => {
    if (DEMO_MODE) {
      toast.info('PDF export requires a configured backend API.')
      return
    }

    setExporting(true)

    try {
      const response = await api.get(`/reports/${id}/pdf`, {
        responseType: 'blob'
      })

      const blob = new Blob([response.data], {
        type: 'application/pdf'
      })

      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')

      anchor.href = url
      anchor.download = `gateguard-${id}.pdf`

      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()

      window.setTimeout(() => {
        URL.revokeObjectURL(url)
      }, 1500)

      toast.success('PDF report download started')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not export PDF report')
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return <Card><p className="card-description">Loading analysis…</p></Card>
  }

  if (!analysis) {
    return (
      <>
        {DEMO_MODE && <DemoNotice />}
        <EmptyState
          title="Analysis not available"
          description="No live analysis is available for this ID. Run the GitHub Actions workflow to submit a real result."
        />
      </>
    )
  }

  const project = analysis.project
  const metrics = analysis.metrics || {}
  const coverage = metrics.coverage || {}
  const tests = metrics.tests || {}
  const security = metrics.security || {}
  const findings = analysis.findings || []

  return (
    <>
      <div className="breadcrumbs">
        <Link to="/app/projects">Projects</Link>
        <span>/</span>
        {project?.name || 'Analysis'}
        <span>/</span>
        Analysis results
      </div>

      <PageHeader
        eyebrow="ANALYSIS DETAILS"
        title="Analysis results"
        description={`${project?.name || 'Repository'} · ${analysis.branch || 'unknown branch'} · ${analysis.commitSha || 'commit unavailable'}`}
        action={
          <Button
            variant="secondary"
            onClick={exportPdf}
            disabled={exporting || DEMO_MODE}
          >
            <Download size={16} />
            {exporting ? 'Preparing…' : 'Export report'}
          </Button>
        }
      />

      <div className="analysis-hero">
        <div className="analysis-status-icon">
          {analysis.status === 'PASS'
            ? <CheckCircle2 size={29} />
            : <ShieldAlert size={29} />}
        </div>

        <div className="analysis-status-copy">
          <Badge status={analysis.status}>{`QUALITY GATE ${analysis.status}`}</Badge>
          <h2>
            {analysis.status === 'PASS'
              ? 'Ready to ship.'
              : 'Quality gate needs attention.'}
          </h2>
          <p>
            {analysis.rules?.filter((r: any) => !r.passed).length || 0} failed quality rules · {findings.length} findings
          </p>
        </div>

        <div className="analysis-score">
          <small>QUALITY SCORE</small>
          <b>{analysis.score}<span>/100</span></b>
        </div>
      </div>

      <div className="analysis-metrics">
        <MetricCard label="Test pass rate" value={`${tests.passRate ?? 0}%`} icon={CheckCircle2} tone="green" />
        <MetricCard label="Line coverage" value={`${coverage.lines ?? 0}%`} icon={TestTube2} tone="cyan" />
        <MetricCard label="Lint errors" value={String(metrics.eslint?.errors ?? 0)} icon={Code2} tone="green" />
        <MetricCard
          label="Critical vulnerabilities"
          value={String(security.critical ?? 0)}
          icon={LockKeyhole}
          tone={security.critical ? 'red' : 'green'}
        />
      </div>

      <div className="dashboard-grid">
        <Card>
          <SectionTitle title="Quality rule evaluation" />
          {(analysis.rules || []).map((rule: any) => (
            <div className="rule-row" key={rule.key}>
              <StatusIcon status={rule.passed ? 'PASS' : 'FAIL'} />
              <div>
                <b>{rule.label}</b>
                <small>{rule.reason}</small>
              </div>
              <Badge status={rule.passed ? 'PASS' : 'FAIL'}>
                {rule.passed ? 'PASSED' : 'FAILED'}
              </Badge>
            </div>
          ))}
        </Card>

        <Card>
          <SectionTitle
            title="AI explanation"
            action={<span className="ai-label"><Sparkles size={13} /> AI INSIGHTS</span>}
          />
          <div className="ai-explanation">
            <div className="ai-icon"><Bot size={20} /></div>
            <div>
              <p>{analysis.aiExplanation || 'No AI explanation was generated for this analysis.'}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <SectionTitle title={`Findings (${findings.length})`} />

        {findings.length ? (
          findings.map((finding: any, index: number) => (
            <div className="finding-row" key={`${finding.title}-${index}`}>
              <Code2 size={17} />
              <div>
                <b>{finding.title}</b>
                <p>{finding.message || finding.recommendation || 'No additional details provided.'}</p>
                <small>
                  {finding.file || finding.package || 'Repository finding'}
                  {finding.line ? ` · Line ${finding.line}` : ''}
                </small>
                {finding.recommendation && (
                  <p><strong>Recommendation:</strong> {finding.recommendation}</p>
                )}
              </div>
              <Badge
                status={
                  finding.severity === 'critical' || finding.severity === 'high'
                    ? 'danger'
                    : finding.severity === 'medium'
                      ? 'warning'
                      : 'info'
                }
              >
                {finding.severity}
              </Badge>
            </div>
          ))
        ) : (
          <EmptyState
            title="No findings reported"
            description="The CI runner did not submit any code or dependency findings."
          />
        )}
      </Card>

      <Card>
        <SectionTitle title="Test and security summary" />
        <div className="report-metrics">
          <div><small>Total tests</small><b>{tests.total ?? 0}</b></div>
          <div><small>Passed</small><b>{tests.passed ?? 0}</b></div>
          <div><small>Failed / skipped</small><b>{(tests.failed ?? 0)} / {(tests.skipped ?? 0)}</b></div>
          <div><small>High + critical</small><b>{(security.high ?? 0) + (security.critical ?? 0)}</b></div>
        </div>
      </Card>
    </>
  )
}

export function QualityRules() {
  const [rules, setRules] = useState(ruleDefaults)
  const [loading, setLoading] = useState(!DEMO_MODE)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (DEMO_MODE) return

    let active = true

    getCached<{ rules: any }>('/rules')
      .then(({ data }) => {
        if (!active) return

        const r = data.rules

        setRules([
          {
            id: 'coverage',
            title: 'Minimum test coverage',
            desc: 'Required line coverage across the project.',
            value: r.minCoverage,
            unit: '%',
            enabled: true
          },
          {
            id: 'passrate',
            title: 'Minimum test pass rate',
            desc: 'Percentage of tests that must pass.',
            value: r.minTestPassRate,
            unit: '%',
            enabled: true
          },
          {
            id: 'eslint',
            title: 'Maximum ESLint errors',
            desc: 'Maximum number of lint errors allowed.',
            value: r.maxEslintErrors,
            unit: 'errors',
            enabled: true
          },
          {
            id: 'critical',
            title: 'Critical vulnerabilities',
            desc: 'Maximum critical dependency vulnerabilities.',
            value: r.maxCriticalVulnerabilities,
            unit: 'issues',
            enabled: true
          },
          {
            id: 'high',
            title: 'High vulnerabilities',
            desc: 'Maximum high severity vulnerabilities.',
            value: r.maxHighVulnerabilities,
            unit: 'issues',
            enabled: true
          }
        ])
      })
      .catch(() => toast.error('Could not load quality rules'))
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const update = (id: string, value: number) => {
    setRules(old =>
      old.map(rule => rule.id === id ? { ...rule, value } : rule)
    )
  }

  const save = async () => {
    if (DEMO_MODE) {
      toast.info('Demo mode: configure VITE_API_URL to save rules to the backend.')
      return
    }

    setSaving(true)

    try {
      const payload = {
        minCoverage: rules.find(r => r.id === 'coverage')!.value,
        minTestPassRate: rules.find(r => r.id === 'passrate')!.value,
        maxEslintErrors: rules.find(r => r.id === 'eslint')!.value,
        maxCriticalVulnerabilities: rules.find(r => r.id === 'critical')!.value,
        maxHighVulnerabilities: rules.find(r => r.id === 'high')!.value
      }

      await api.put('/rules', payload)
      toast.success('Quality rules saved successfully')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not save quality rules')
    } finally {
      setSaving(false)
    }
  }

  // Reset defaults and save them to the backend.
  const reset = async () => {
    const defaults = ruleDefaults.map(r => ({ ...r }))

    if (DEMO_MODE) {
      setRules(defaults)
      toast.success('Default quality rules restored')
      return
    }

    setSaving(true)

    try {
      const payload = {
        minCoverage: 80,
        minTestPassRate: 95,
        maxEslintErrors: 0,
        maxCriticalVulnerabilities: 0,
        maxHighVulnerabilities: 0
      }

      await api.put('/rules', payload)

      setRules(defaults)
      toast.success('Default quality rules restored and saved')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not reset quality rules')
    } finally {
      setSaving(false)
    }
  }

  const group = (
    title: string,
    description: string,
    items: typeof rules
  ) => (
    <Card>
      <SectionTitle title={title} />
      <p className="card-description">{description}</p>

      {items.map(rule => (
        <div className="config-rule" key={rule.id}>
          <div className="config-rule-copy">
            <b>{rule.title}</b>
            <p>{rule.desc}</p>
          </div>

          <div className="threshold-input">
            <input
              aria-label={rule.title}
              type="number"
              min="0"
              max={rule.unit === '%' ? 100 : undefined}
              value={rule.value}
              onChange={e =>
                update(
                  rule.id,
                  Math.min(
                    rule.unit === '%' ? 100 : Number.MAX_SAFE_INTEGER,
                    Math.max(0, Number(e.target.value))
                  )
                )
              }
            />
            <span>{rule.unit}</span>
          </div>
        </div>
      ))}
    </Card>
  )

  return (
    <>
      {DEMO_MODE && <DemoNotice />}

      <PageHeader
        eyebrow="CONFIGURATION"
        title="Quality rules"
        description="Set the standards every repository must meet before it can pass."
        action={
          <Button
            variant="secondary"
            onClick={reset}
            disabled={saving || loading}
          >
            Reset defaults
          </Button>
        }
      />

      {loading ? (
        <Card><p className="card-description">Loading quality rules…</p></Card>
      ) : (
        <div className="rules-layout">
          <div className="rules-main">
            {group(
              'Coverage & testing',
              'Minimum thresholds for test health and coverage.',
              rules.slice(0, 2)
            )}

            {group(
              'Code quality',
              'Maximum static analysis issues allowed.',
              rules.slice(2, 3)
            )}

            {group(
              'Security policies',
              'Security thresholds are release-blocking.',
              rules.slice(3)
            )}

            <div className="form-actions">
              <Button
                variant="secondary"
                onClick={reset}
                disabled={saving}
              >
                Reset defaults
              </Button>

              <Button onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save rules'} <Check size={16} />
              </Button>
            </div>
          </div>

          <Card className="rules-aside">
            <div className="side-info-icon"><ShieldCheck size={21} /></div>
            <h3>How quality gates work</h3>
            <p className="card-description">
              Every configured threshold is evaluated against analysis output. If any mandatory threshold fails, the overall gate fails.
            </p>

            <div className="gate-mini">
              <Badge status="PASS">PASS</Badge>
              <p>All configured thresholds meet their limits.</p>
            </div>

            <div className="gate-mini fail">
              <Badge status="FAIL">FAIL</Badge>
              <p>At least one mandatory threshold is outside its limit.</p>
            </div>

            <div className="security-note">
              <LockKeyhole size={16} />
              <span>Security rules are release-blocking.</span>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}

export function HistoryPage() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All')
  const [rows, setRows] = useState<any[]>(DEMO_MODE ? demoHistory : [])
  const [loading, setLoading] = useState(!DEMO_MODE)

  useEffect(() => {
    if (DEMO_MODE) return

    let active = true

    getCached<{ analyses: any[] }>('/analyses?limit=100')
      .then(({ data }) => {
        if (active) {
          setRows(
            data.analyses.map(a => ({
              id: a._id,
              project: a.project?.name || 'Unknown project',
              date: new Date(a.createdAt).toLocaleString(),
              score: a.score,
              coverage: `${a.metrics?.coverage?.lines ?? 0}%`,
              issues: a.findings?.length || 0,
              status: a.status
            }))
          )
        }
      })
      .catch(() => toast.error('Could not load analysis history'))
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const filtered = rows.filter(
    h =>
      (h.project + h.id).toLowerCase().includes(query.toLowerCase()) &&
      (status === 'All' || h.status === status)
  )

  return (
    <>
      {DEMO_MODE && <DemoNotice />}

      <PageHeader
        eyebrow="WORKSPACE"
        title="Analysis history"
        description="Review previous quality runs across your repositories."
      />

      <Card>
        <div className="toolbar">
          <label className="search-field">
            <Search size={16} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search project or analysis ID…"
            />
          </label>

          <select
            className="select-control"
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            <option>All</option>
            <option>PASS</option>
            <option>FAIL</option>
            <option>WARNING</option>
          </select>

          <Button variant="secondary" size="sm">
            <Filter size={15} /> Filters
          </Button>
        </div>

        {loading ? (
          <p className="card-description">Loading analyses…</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>ANALYSIS</th>
                  <th>DATE</th>
                  <th>QUALITY SCORE</th>
                  <th>COVERAGE</th>
                  <th>ISSUES</th>
                  <th>STATUS</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map(h => (
                  <tr key={h.id}>
                    <td>
                      <b>{h.project}</b>
                      <small className="table-sub">{h.id}</small>
                    </td>
                    <td className="muted-cell">{h.date}</td>
                    <td><b>{h.score}/100</b></td>
                    <td>{h.coverage}</td>
                    <td>{h.issues}</td>
                    <td><Badge status={h.status}>{h.status}</Badge></td>
                    <td>
                      <Link to={`/app/analysis/${h.id}`} className="table-arrow">
                        <ArrowUpRight size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <EmptyState
            title="No matching analyses"
            description="Run a repository analysis or change your search filters."
          />
        )}

        <div className="table-foot">
          Showing {filtered.length} analysis records
          <span>{DEMO_MODE ? 'Sample history' : 'Live analysis history'}</span>
        </div>
      </Card>
    </>
  )
}

export function Reports() {
  const [analyses, setAnalyses] = useState<any[]>([])
  const [selected, setSelected] = useState('')
  const [loading, setLoading] = useState(!DEMO_MODE)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (DEMO_MODE) return

    let active = true

    getCached<{ analyses: any[] }>('/analyses?limit=100')
      .then(({ data }) => {
        if (!active) return

        setAnalyses(data.analyses)

        if (data.analyses[0]) {
          setSelected(data.analyses[0]._id)
        }
      })
      .catch(() => toast.error('Could not load reports'))
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const current = analyses.find(a => a._id === selected)

  const exportPdf = async () => {
    if (!current) {
      toast.error('No analysis available to export')
      return
    }

    if (DEMO_MODE) {
      toast.error('PDF export requires a configured backend API')
      return
    }

    setExporting(true)

    try {
      const response = await api.get(
        `/reports/${current._id}/pdf`,
        { responseType: 'blob' }
      )

      const blob = new Blob([response.data], {
        type: 'application/pdf'
      })

      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')

      anchor.href = url
      anchor.download = `gateguard-${current._id}.pdf`

      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()

      window.setTimeout(() => {
        URL.revokeObjectURL(url)
      }, 1500)

      toast.success('PDF report download started')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not export report')
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      {DEMO_MODE && <DemoNotice />}

      <PageHeader
        eyebrow="INSIGHTS"
        title="Reports"
        description="Export verified quality, testing and security results."
        action={
          <Button
            onClick={exportPdf}
            disabled={!current || exporting || DEMO_MODE}
          >
            <Download size={16} />
            {exporting ? 'Preparing…' : 'Export PDF'}
          </Button>
        }
      />

      {loading ? (
        <Card><p className="card-description">Loading report data…</p></Card>
      ) : current ? (
        <Card>
          <div className="toolbar">
            <label className="field compact-field">
              <span>Analysis</span>
              <select
                value={selected}
                onChange={e => setSelected(e.target.value)}
              >
                {analyses.map(a => (
                  <option key={a._id} value={a._id}>
                    {a.project?.name || 'Project'} · {new Date(a.createdAt).toLocaleString()}
                  </option>
                ))}
              </select>
            </label>

            <span className="report-date">
              {new Date(current.createdAt).toLocaleString()}
            </span>
          </div>

          <div className="report-cover">
            <div className="brand-mark"><ShieldCheck size={22} /></div>
            <div>
              <div className="eyebrow">SOFTWARE QUALITY REPORT</div>
              <h2>{current.project?.name || 'Repository'}</h2>
              <p>
                {current.project?.repoFullName || ''} · {current.branch || 'unknown branch'}
              </p>
            </div>
            <div className="report-score">
              <b>{current.score}</b>
              <small>/100</small>
              <Badge status={current.status}>{current.status}</Badge>
            </div>
          </div>

          <div className="report-metrics">
            <div>
              <small>Line coverage</small>
              <b>{current.metrics?.coverage?.lines ?? 0}%</b>
            </div>
            <div>
              <small>Tests passed</small>
              <b>{current.metrics?.tests?.passed ?? 0}/{current.metrics?.tests?.total ?? 0}</b>
            </div>
            <div>
              <small>Findings</small>
              <b>{current.findings?.length ?? 0}</b>
            </div>
            <div>
              <small>Critical vulnerabilities</small>
              <b>{current.metrics?.security?.critical ?? 0}</b>
            </div>
          </div>

          <h3>Quality rule results</h3>

          {(current.rules || []).map((r: any) => (
            <div className="rule-row" key={r.key}>
              <StatusIcon status={r.passed ? 'PASS' : 'FAIL'} />
              <div>
                <b>{r.label}</b>
                <small>{r.reason}</small>
              </div>
              <Badge status={r.passed ? 'PASS' : 'FAIL'}>
                {r.passed ? 'PASS' : 'FAIL'}
              </Badge>
            </div>
          ))}

          <div className="report-recommend">
            <Sparkles size={18} />
            <div>
              <b>Analysis explanation</b>
              <p>{current.aiExplanation || 'No AI explanation available.'}</p>
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <EmptyState
            title="No reports yet"
            description={
              DEMO_MODE
                ? 'Configure VITE_API_URL to connect to your backend.'
                : 'Submit a GitHub Actions analysis to generate your first quality report.'
            }
          />
        </Card>
      )}
    </>
  )
}

export function SettingsPage() {
  const [tab, setTab] = useState('Profile')
  const stored = getStoredUser()

  const [name, setName] = useState(stored?.name || '')
  const [email, setEmail] = useState(stored?.email || '')
  const [githubConnected, setGithubConnected] = useState(Boolean(stored?.githubConnected))
  const [notifications, setNotifications] = useState([true, true, false])
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const navigate = useNavigate()
  const tabs = ['Profile', 'GitHub integration', 'Notifications', 'Security']

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    if (params.get('github') === 'connected') {
      setGithubConnected(true)
      toast.success('GitHub account connected')
    } else if (params.get('github') === 'error') {
      toast.error('GitHub connection failed. Check OAuth configuration and try again')
    }
  }, [])

  const saveProfile = async () => {
    if (DEMO_MODE) {
      toast.info('Profile changes require a configured backend API.')
      return
    }

    setBusy(true)

    try {
      const { data } = await api.patch<{ user: any }>('/auth/profile', {
        name,
        email
      })

      const token = getAccessToken()

      if (token) saveSession(token, data.user)

      toast.success('Profile updated')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not update profile')
    } finally {
      setBusy(false)
    }
  }

  const connectGithub = async () => {
    try {
      const { data } = await api.get<{ authorizationUrl: string }>('/github/connect')
      window.location.assign(data.authorizationUrl)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not start GitHub connection')
    }
  }

  const disconnectGithub = async () => {
    try {
      await api.delete('/github/disconnect')
      setGithubConnected(false)
      toast.success('GitHub account disconnected')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not disconnect GitHub')
    }
  }

  const updatePassword = async () => {
    if (newPassword.length < 8) {
      toast.error('New password must contain at least 8 characters')
      return
    }

    setBusy(true)

    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword
      })

      clearSession()
      toast.success('Password changed. Please sign in again.')
      navigate('/auth/login', { replace: true })
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not change password')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="PREFERENCES"
        title="Settings"
        description="Manage your account, integrations and workspace preferences."
      />

      <div className="settings-layout">
        <Card className="settings-nav">
          {tabs.map(t => (
            <button
              key={t}
              className={tab === t ? 'active' : ''}
              onClick={() => setTab(t)}
            >
              {t === 'Profile'
                ? <UserRound size={17} />
                : t === 'GitHub integration'
                  ? <Github size={17} />
                  : t === 'Notifications'
                    ? <Bell size={17} />
                    : <KeyRound size={17} />}
              {' '}{t}
            </button>
          ))}
        </Card>

        <Card className="settings-content">
          <h2>{tab}</h2>

          {tab === 'Profile' ? (
            <>
              <p className="card-description">
                Update your personal information and account details.
              </p>

              <div className="profile-avatar-row">
                <div className="profile-avatar">
                  {(name || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <b>Account profile</b>
                  <small>Profile information stored in your GateGuard account.</small>
                </div>
              </div>

              <label className="field">
                <span>Full name</span>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  maxLength={80}
                />
              </label>

              <label className="field">
                <span>Email address</span>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </label>

              <Button onClick={saveProfile} disabled={busy}>
                {busy ? 'Saving…' : 'Save changes'}
              </Button>

              <div className="security-note">
                <LockKeyhole size={16} />
                <button
                  type="button"
                  onClick={() => {
                    clearSession()
                    navigate('/auth/login', { replace: true })
                  }}
                >
                  Sign out of this account
                </button>
              </div>
            </>
          ) : tab === 'GitHub integration' ? (
            <>
              <p className="card-description">
                Connect GitHub to import repositories and receive workflow results.
              </p>

              <div className="github-connect-box">
                <Github size={27} />
                <div>
                  <b>{githubConnected ? 'GitHub connected' : 'GitHub account'}</b>
                  <small>
                    {githubConnected
                      ? `Connected as ${stored?.githubUsername || 'your GitHub account'}`
                      : 'Authorize GateGuard to access your repositories.'}
                  </small>
                </div>

                {githubConnected ? (
                  <Button variant="secondary" onClick={disconnectGithub}>
                    Disconnect
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={connectGithub}>
                    Connect GitHub
                  </Button>
                )}
              </div>
            </>
          ) : tab === 'Notifications' ? (
            <>
              <p className="card-description">
                Notification preferences are not yet persisted by the backend.
              </p>

              {['Analysis completed', 'Quality gate failed', 'Weekly quality summary'].map((t, i) => (
                <div className="config-rule" key={t}>
                  <div className="config-rule-copy">
                    <b>{t}</b>
                    <p>Preference preview only; email delivery is not configured.</p>
                  </div>

                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={notifications[i]}
                      onChange={e =>
                        setNotifications(old =>
                          old.map((v, j) => i === j ? e.target.checked : v)
                        )
                      }
                    />
                    <span />
                  </label>
                </div>
              ))}
            </>
          ) : (
            <>
              <p className="card-description">
                Change your password. Other active sessions will be invalidated.
              </p>

              <label className="field">
                <span>Current password</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                />
              </label>

              <label className="field">
                <span>New password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
              </label>

              <Button
                onClick={updatePassword}
                disabled={busy || !currentPassword || !newPassword}
              >
                {busy ? 'Updating…' : 'Update password'}
              </Button>
            </>
          )}
        </Card>
      </div>
    </>
  )
}

export function DocsPage() {
  const [active, setActive] = useState('Introduction')
  const [query, setQuery] = useState('')

  const topics = [
    'Introduction',
    'Getting started',
    'Connect GitHub',
    'Add a repository',
    'Automated analysis',
    'Quality gate rules',
    'Understanding reports',
    'Troubleshooting'
  ]

  const descriptions: Record<string, string> = {
    'Introduction': 'GateGuard brings code quality, test coverage, dependency security and release thresholds into one developer-focused workflow.',
    'Getting started': 'Create an account, connect a repository and configure your first quality gate.',
    'Connect GitHub': 'Use the secure GitHub authorization flow to grant repository access. OAuth credentials should be stored and exchanged by your backend.',
    'Add a repository': 'Choose a repository, select the branch you want to monitor and save it to your workspace.',
    'Automated analysis': 'A dedicated runner executes linting, tests, coverage and dependency audit in an isolated environment.',
    'Quality gate rules': 'Set minimum coverage and test pass rates, plus maximum lint errors and vulnerability thresholds.',
    'Understanding reports': 'Reports summarize the quality score, gate decision, code findings, tests, coverage and security results.',
    'Troubleshooting': 'Check repository permissions, workflow logs, runner output and API connectivity when an analysis does not complete.'
  }

  return (
    <>
      <PageHeader
        eyebrow="HELP CENTER"
        title="Documentation"
        description="Learn how GateGuard works and how to get the most from your quality workflow."
      />

      <div className="docs-layout">
        <Card className="docs-sidebar">
          <label className="search-field">
            <Search size={15} />
            <input
              placeholder="Search docs…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </label>

          <div className="nav-label">GETTING STARTED</div>

          {topics
            .filter(t => t.toLowerCase().includes(query.toLowerCase()))
            .map((t, i) => (
              <button
                key={t}
                className={active === t ? 'active' : ''}
                onClick={() => setActive(t)}
              >
                {i === 0 ? <BookOpen size={15} /> : <CircleDot size={15} />}
                {' '}{t}
              </button>
            ))}
        </Card>

        <Card className="docs-article">
          <div className="eyebrow">GATEGUARD DOCUMENTATION</div>
          <h2>{active}</h2>
          <p>{descriptions[active]}</p>

          <div className="docs-callout">
            <InfoIcon />
            <span>
              This frontend currently runs in demo mode. Live repository analysis requires the Express API and an isolated GitHub Actions runner.
            </span>
          </div>

          <h3>What you need to know</h3>
          <ul>
            <li>Connect repositories through server-managed GitHub OAuth.</li>
            <li>Run analysis in an isolated runner, not directly on the production API server.</li>
            <li>Evaluate quality gate rules against structured analysis results.</li>
            <li>Use the report and history views to track quality over time.</li>
          </ul>

          <div className="docs-code">
            <span>WORKFLOW</span>
            <code>Repository → Analysis → Quality Gate → Report</code>
          </div>

          <div className="docs-pagination">
            <button
              onClick={() =>
                setActive(topics[Math.max(0, topics.indexOf(active) - 1)])
              }
            >
              ← Previous
            </button>
            <button
              onClick={() =>
                setActive(topics[Math.min(topics.length - 1, topics.indexOf(active) + 1)])
              }
            >
              Next article →
            </button>
          </div>
        </Card>
      </div>
    </>
  )
}

function InfoIcon() {
  return <AlertCircle size={17} />
}

export function TeamPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [projectId, setProjectId] = useState('')
  const [members, setMembers] = useState<any[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('developer')
  const [busy, setBusy] = useState(false)
  const loadMembers = async (id: string) => {
    if (!id) return
    try { const { data } = await api.get(`/workspace/projects/${id}/members`); setMembers(data.members || []) }
    catch { toast.error('Team management is available to project owners and admins.') }
    try { const { data } = await api.get(`/workspace/audit?projectId=${encodeURIComponent(id)}`); setAuditLogs(data.logs || []) }
    catch { setAuditLogs([]) }
  }
  useEffect(() => { api.get('/projects').then(({ data }) => { setProjects(data.projects || []); if (data.projects?.[0]) setProjectId(String(data.projects[0]._id)) }).catch(() => toast.error('Could not load projects')) }, [])
  useEffect(() => { if (projectId) loadMembers(projectId) }, [projectId])
  const invite = async (event: FormEvent) => { event.preventDefault(); setBusy(true); try { await api.post(`/workspace/projects/${projectId}/members`, { email, role }); toast.success('Invitation created'); setEmail(''); await loadMembers(projectId) } catch (e: any) { toast.error(e?.response?.data?.message || 'Could not invite member') } finally { setBusy(false) } }
  const changeRole = async (member: any, nextRole: string) => { try { await api.patch(`/workspace/projects/${projectId}/members/${member._id}`, { role: nextRole }); await loadMembers(projectId); toast.success('Role updated') } catch { toast.error('Could not update role') } }
  const remove = async (member: any) => { if (!confirm(`Remove ${member.email} from this project?`)) return; try { await api.delete(`/workspace/projects/${projectId}/members/${member._id}`); await loadMembers(projectId); toast.success('Member removed') } catch { toast.error('Could not remove member') } }
  return <><PageHeader eyebrow="ACCESS CONTROL" title="Team & permissions" description="Invite collaborators and manage project-level access roles."/><Card><div className="workspace-form-grid"><label>Project<select value={projectId} onChange={e => setProjectId(e.target.value)}>{projects.map(p => <option key={p._id} value={p._id}>{p.name} · {p.repoFullName}</option>)}</select></label><div className="role-explainer"><b>Role permissions</b><span>Admin: manage project members · Manager: manage quality policy · Developer: view project and analysis · Viewer: read-only access.</span></div></div></Card><Card><SectionTitle title="Invite a collaborator"/><form className="invite-form" onSubmit={invite}><input type="email" required placeholder="developer@company.com" value={email} onChange={e => setEmail(e.target.value)}/><select value={role} onChange={e => setRole(e.target.value)}><option value="admin">Admin</option><option value="manager">Project Manager</option><option value="developer">Developer</option><option value="viewer">Viewer</option></select><Button disabled={busy || !projectId}>{busy ? 'Inviting…' : 'Send invitation'}</Button></form><p className="card-description">Existing GateGuard accounts receive access immediately. If the email is not registered yet, the invitation activates when that person signs up or signs in with the invited email. Invitation emails are not sent by this release.</p></Card><Card><SectionTitle title="Project members" action={<Badge>{members.length} members</Badge>}/>{members.length ? <div className="member-list">{members.map(m => <div className="member-row" key={m._id}><div className="member-avatar">{m.email.slice(0,1).toUpperCase()}</div><div className="member-identity"><b>{m.email}</b><small>{m.status === 'active' ? 'Active' : 'Invitation pending'}</small></div><select aria-label={`Role for ${m.email}`} value={m.role} onChange={e => changeRole(m,e.target.value)}><option value="admin">Admin</option><option value="manager">Project Manager</option><option value="developer">Developer</option><option value="viewer">Viewer</option></select><Button variant="danger" size="sm" onClick={() => remove(m)}>Remove</Button></div>)}</div> : <EmptyState title="No collaborators yet" description="Invite developers, managers or viewers to collaborate on this repository."/>}</Card><Card><SectionTitle title="Project audit log" action={<Badge>{auditLogs.length} events</Badge>}/>{auditLogs.length ? <div className="audit-list">{auditLogs.map(log => <div className="audit-row" key={log._id}><div className="audit-mark"><Activity size={15}/></div><div><b>{log.action.replaceAll('.', ' ')}</b><p>{log.details}</p><small>{log.actor?.name || log.actorLabel} · {new Date(log.createdAt).toLocaleString()}</small></div></div>)}</div> : <p className="card-description">Project changes and CI events will appear here. Audit history is visible to owners, admins and managers.</p>}</Card></>
}

export function NotificationsPage() {
  const [items, setItems] = useState<any[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)
  const [slackConfigured, setSlackConfigured] = useState(false)
  const [slackUrl, setSlackUrl] = useState('')
  const [slackBusy, setSlackBusy] = useState(false)
  const load = () => api.get('/workspace/notifications').then(({ data }) => { setItems(data.notifications || []); setUnread(data.unread || 0) }).catch(() => toast.error('Could not load notifications')).finally(() => setLoading(false))
  useEffect(() => { load(); api.get('/workspace/notifications/slack').then(({ data }) => setSlackConfigured(Boolean(data.configured))).catch(() => {}) ; const timer = window.setInterval(load, 30000); return () => window.clearInterval(timer) }, [])
  const saveSlack = async (event: FormEvent) => { event.preventDefault(); setSlackBusy(true); try { await api.put('/workspace/notifications/slack', { webhookUrl: slackUrl }); setSlackConfigured(true); setSlackUrl(''); toast.success('Slack connected. Test message delivered.') } catch (e: any) { toast.error(e?.response?.data?.message || 'Could not connect Slack') } finally { setSlackBusy(false) } }
  const removeSlack = async () => { try { await api.delete('/workspace/notifications/slack'); setSlackConfigured(false); toast.success('Slack disconnected') } catch { toast.error('Could not disconnect Slack') } }
  const markOne = async (id: string) => { try { await api.patch(`/workspace/notifications/${id}/read`); await load() } catch { toast.error('Could not update notification') } }
  const markAll = async () => { try { await api.post('/workspace/notifications/read-all'); await load(); toast.success('All notifications marked as read') } catch { toast.error('Could not update notifications') } }
  return <><PageHeader eyebrow="WORKSPACE ACTIVITY" title="Notifications" description="Quality gate, security, coverage and pull request events." action={<Button variant="secondary" disabled={!unread} onClick={markAll}>Mark all as read</Button>}/><Card><SectionTitle title="Slack delivery" action={<Badge status={slackConfigured ? 'connected' : 'warning'}>{slackConfigured ? 'Connected' : 'Not connected'}</Badge>}/><p className="card-description">Send important GateGuard events to a Slack channel using an Incoming Webhook. The webhook is encrypted at rest and never returned to the browser.</p>{slackConfigured ? <Button variant="secondary" onClick={removeSlack}>Disconnect Slack</Button> : <form className="invite-form" onSubmit={saveSlack}><input type="url" required placeholder="https://hooks.slack.com/services/..." value={slackUrl} onChange={e => setSlackUrl(e.target.value)}/><Button disabled={slackBusy}>{slackBusy ? 'Connecting…' : 'Connect Slack'}</Button></form>}</Card><div className="notification-summary"><div><b>{unread}</b><span>Unread</span></div><div><b>{items.length}</b><span>Total events</span></div><div><b>Live</b><span>In-app event feed</span></div></div><Card>{loading ? <p className="card-description">Loading notifications…</p> : items.length ? <div className="notification-list">{items.map(n => <div className={`notification-row ${n.readAt ? 'is-read' : 'is-unread'}`} key={n._id}><div className={`notification-symbol ${n.severity}`}><Bell size={17}/></div><div className="notification-copy"><div className="notification-title"><b>{n.title}</b><Badge status={n.severity}>{n.severity}</Badge></div><p>{n.message}</p><small>{n.project?.name || 'Workspace'} · {new Date(n.createdAt).toLocaleString()}</small></div>{!n.readAt && <Button size="sm" variant="secondary" onClick={() => markOne(n._id)}>Mark read</Button>}</div>)}</div> : <EmptyState title="You're all caught up" description="GateGuard will show quality and security events here when your CI pipeline reports results."/>}</Card></>
}

export function PolicyTemplatesPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [projectId, setProjectId] = useState('')
  const [templates, setTemplates] = useState<Record<string, any>>({})
  const [busy, setBusy] = useState('')
  useEffect(() => { api.get('/projects').then(({ data }) => { setProjects(data.projects || []); if (data.projects?.[0]) setProjectId(String(data.projects[0]._id)) }).catch(() => toast.error('Could not load projects')); api.get('/workspace/policy-templates').then(({ data }) => setTemplates(data.templates || {})).catch(() => toast.error('Could not load policy templates')) }, [])
  const apply = async (key: string) => { if (!projectId) return toast.error('Add a project first'); setBusy(key); try { await api.post('/workspace/policy-templates/apply', { projectId, template: key }); toast.success(`${templates[key]?.label || key} policy applied`); } catch (e: any) { toast.error(e?.response?.data?.message || 'Could not apply policy') } finally { setBusy('') } }
  return <><PageHeader eyebrow="QUALITY GOVERNANCE" title="Policy templates" description="Apply consistent release standards based on your team's delivery and risk profile."/><Card><label className="project-picker-label">Apply templates to<select value={projectId} onChange={e => setProjectId(e.target.value)}>{projects.map(p => <option key={p._id} value={p._id}>{p.name} · {p.repoFullName}</option>)}</select></label></Card><div className="policy-template-grid">{Object.entries(templates).map(([key, t]: [string, any]) => <Card key={key}><div className="policy-template-icon"><ShieldCheck size={20}/></div><h3>{t.label}</h3><p>{t.description}</p><div className="policy-thresholds"><span>Coverage <b>{t.minCoverage}%</b></span><span>Test pass rate <b>{t.minTestPassRate}%</b></span><span>ESLint errors <b>{t.maxEslintErrors}</b></span><span>Critical / High <b>{t.maxCriticalVulnerabilities} / {t.maxHighVulnerabilities}</b></span></div><Button disabled={!!busy || !projectId} onClick={() => apply(key)}>{busy === key ? 'Applying…' : 'Apply template'}</Button></Card>)}</div><p className="card-description">Applying a template overwrites the selected project's current quality thresholds. Existing analysis history is preserved; the new policy is used for subsequent CI runs.</p></>
}

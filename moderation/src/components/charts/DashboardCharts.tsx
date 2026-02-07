import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { TrendingUp, PieChart as PieIcon } from 'lucide-react'

const chartColors = {
  primary: '#7C5CFF',
  secondary: '#2DE2E6',
  accent: '#FFBD59',
  destructive: '#FF4D6D',
  success: '#00D68F',
  muted: 'rgba(255,255,255,0.05)',
  grid: 'rgba(255,255,255,0.06)',
  text: 'hsl(225, 30%, 60%)',
}

const PIE_COLORS = [
  chartColors.primary,
  chartColors.secondary,
  chartColors.accent,
  chartColors.destructive,
  chartColors.success,
  '#A78BFA',
  '#F472B6',
]

const reasonLabels: Record<string, string> = {
  spam: 'Spam',
  harassment: 'Harcèlement',
  inappropriate_content: 'Contenu inapproprié',
  hate_speech: 'Discours haineux',
  violence: 'Violence',
  misinformation: 'Désinformation',
  other: 'Autre',
  scam: 'Arnaque',
  nudity: 'Nudité',
  copyright: 'Droits d\'auteur',
}

interface WeeklyTrendProps {
  data?: Array<{ date: string; count: number }>
}

export function WeeklyTrendChart({ data }: WeeklyTrendProps) {
  const chartData = data || generateMockWeeklyData()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Card className="hover:border-primary/20 transition-all duration-300">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="h-4 w-4 text-primary" />
            Signalements - 7 derniers jours
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: chartColors.text, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: chartColors.text, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(220, 26%, 8%)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: 'hsl(225, 100%, 96%)',
                    fontSize: '12px',
                  }}
                  labelFormatter={(label) => `${label}`}
                  formatter={(value: number | undefined) => [`${value ?? 0} signalements`, '']}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke={chartColors.primary}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorReports)"
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

interface ReasonDistributionProps {
  data?: Array<{ _id: string; count: number }>
}

export function ReasonDistributionChart({ data }: ReasonDistributionProps) {
  const chartData = (data || []).map((item) => ({
    name: reasonLabels[item._id] || item._id,
    value: item.count,
  }))

  if (chartData.length === 0) return null

  const total = chartData.reduce((sum, item) => sum + item.value, 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <Card className="hover:border-primary/20 transition-all duration-300">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <PieIcon className="h-4 w-4 text-secondary" />
            Répartition par raison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="h-[200px] w-[200px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    animationDuration={1000}
                    animationEasing="ease-out"
                  >
                    {chartData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(220, 26%, 8%)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: 'hsl(225, 100%, 96%)',
                      fontSize: '12px',
                    }}
                    formatter={(value: number | undefined) => [`${value ?? 0} (${Math.round((value ?? 0) / total * 100)}%)`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-1.5 text-xs">
              {chartData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                  />
                  <span className="text-muted-foreground">{item.name}</span>
                  <span className="ml-auto font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function generateMockWeeklyData() {
  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
  const today = new Date()
  return days.map((day, i) => {
    const date = new Date(today)
    date.setDate(date.getDate() - (6 - i))
    return {
      date: day,
      count: Math.floor(Math.random() * 15) + 2,
    }
  })
}

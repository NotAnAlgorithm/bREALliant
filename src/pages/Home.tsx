import { CoursePath } from '../components/course/CoursePath'
import { LearningMetrics } from '../components/metrics/LearningMetrics'
import { NextUp } from '../components/recommend/NextUp'

export function Home() {
  return (
    <div className="space-y-6">
      <NextUp />
      <LearningMetrics />
      <CoursePath />
    </div>
  )
}

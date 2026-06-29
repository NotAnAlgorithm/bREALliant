import { CourseMap } from '../components/course/CourseMap'
import { CoursePath } from '../components/course/CoursePath'
import { CourseViewToggle } from '../components/course/CourseViewToggle'
import { LearningMetrics } from '../components/metrics/LearningMetrics'
import { NextUp } from '../components/recommend/NextUp'
import { useCourseView } from '../hooks/useCourseView'

export function Home() {
  const { view } = useCourseView()

  return (
    <div className="space-y-6">
      <NextUp />
      <LearningMetrics />
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-medium text-ink">Your path</h2>
        <CourseViewToggle />
      </div>
      {view === 'map' ? <CourseMap /> : <CoursePath />}
    </div>
  )
}

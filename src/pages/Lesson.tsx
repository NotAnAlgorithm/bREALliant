import { Link, useParams } from 'react-router-dom'

import { LessonRenderer } from '../components/lesson/LessonRenderer'
import {
  getAvailableLessonIds,
  tryLoadLesson,
} from '../lib/content/schema-loader'

export function Lesson() {
  const { lessonId } = useParams<{ lessonId: string }>()

  if (!lessonId) {
    return <LessonNotFound message="No lesson specified." />
  }

  const lesson = tryLoadLesson(lessonId)

  if (!lesson) {
    return <LessonNotFound lessonId={lessonId} />
  }

  return <LessonRenderer lesson={lesson} />
}

function LessonNotFound({
  lessonId,
  message,
}: {
  lessonId?: string
  message?: string
}) {
  const available = getAvailableLessonIds()

  return (
    <div className="space-y-4 text-center">
      <h1 className="text-xl font-semibold text-ink">Lesson not found</h1>
      <p className="text-sm text-ink-muted">
        {message ?? `"${lessonId}" is not in the content bundle.`}
      </p>
      {available.length > 0 && (
        <ul className="space-y-2 text-sm">
          {available.map((id) => (
            <li key={id}>
              <Link to={`/lesson/${id}`} className="text-brand hover:underline">
                {id}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link to="/" className="inline-block text-sm text-brand hover:underline">
        ← Back to course path
      </Link>
    </div>
  )
}

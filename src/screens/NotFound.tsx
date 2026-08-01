import { Link } from 'react-router'

export default function NotFound() {
  return (
    <div data-testid="not-found">
      <h1>404 - Page not found</h1>
      <p>The page you're looking for doesn't exist or has moved.</p>
      <Link to="/login">Back to sign in</Link>
    </div>
  )
}

import { useState } from 'react'
import BookTimeOffModal from '@/components/BookTimeOffModal'
import Button from '@/components/Button'
import Icon from '@/components/Icon'

export default function BookTimeOffButton({
  onBooked,
}: {
  onBooked: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        <Icon name="plus" />
        Book time off
      </Button>
      {open && (
        <BookTimeOffModal onClose={() => setOpen(false)} onBooked={onBooked} />
      )}
    </>
  )
}

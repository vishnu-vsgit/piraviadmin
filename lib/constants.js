export const DEFAULT_CHECKPOINTS = [
  { id: 1, name: 'Day 1 Lunch' },
  { id: 2, name: 'Day 1 Dinner' },
  { id: 3, name: 'Day 2 Breakfast' },
  { id: 4, name: 'Day 2 Lunch' },
  { id: 5, name: 'Event 1' },
  { id: 6, name: 'Event 2' },
  { id: 7, name: 'Event 3' },
  { id: 8, name: 'Event 4' },
  { id: 9, name: 'Event 5' },
  { id: 10, name: 'Event 6' },
  { id: 11, name: 'Event 7' },
  { id: 12, name: 'Event 8' },
  { id: 13, name: 'Proshow' },
];

export function getCheckpointName(id, checkpoints = DEFAULT_CHECKPOINTS) {
  const numId = Number(id);
  const found = checkpoints.find((c) => Number(c.id) === numId);
  return found ? found.name : `Checkpoint ${id}`;
}

export function formatTime(timestamp) {
  if (!timestamp) return 'Just now';
  try {
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch (e) {
    return String(timestamp);
  }
}

export function formatDateTime(timestamp) {
  if (!timestamp) return '';
  try {
    const d = new Date(timestamp);
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } catch (e) {
    return String(timestamp);
  }
}


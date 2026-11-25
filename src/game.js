export const CARS = [
  { name: 'Rosso', color: '#dc0000' }, { name: 'Giallo', color: '#ffd100' },
  { name: 'Nero', color: '#2b2b2b' }, { name: 'Bianco', color: '#f2f2f2' },
  { name: 'Blu', color: '#1e50d6' }, { name: 'Argento', color: '#b5bac1' },
  { name: 'Verde', color: '#0f8a4a' }, { name: 'Arancio', color: '#ff7a00' },
  { name: 'Viola', color: '#8a2be2' }, { name: 'Rosa', color: '#ff4fa3' },
  { name: 'Turchese', color: '#00bfb3' }, { name: 'Oro', color: '#c9a227' },
]

export const DEFAULT_QUESTIONS = [
  { text: 'In which year was Scuderia Ferrari founded?', options: ['1929', '1947', '1950', '1960'], correct: 0 },
  { text: 'Who founded Ferrari?', options: ['Enzo Ferrari', 'Henry Ford', 'Ettore Bugatti', 'Ferdinand Porsche'], correct: 0 },
  { text: "What is Ferrari's famous color?", options: ['Red', 'Blue', 'Green', 'Black'], correct: 0 },
  { text: "What is the name of Ferrari's Formula 1 team?", options: ['Scuderia Ferrari', 'Ferrari Racing Club', 'Ferrari Sport', 'Ferrari Grand Prix'], correct: 0 },
  { text: 'In which year did Ferrari produce its first road car?', options: ['1947', '1929', '1950', '1965'], correct: 0 },
]

export function genCode() {
  const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  return Array.from({ length: 4 }, () => L[Math.floor(Math.random() * L.length)]).join('')
}

export function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// More correct answers first; if equal, lower total answer time first
export function rank(list) {
  return [...list].sort((a, b) => (b.pos || 0) - (a.pos || 0) || (a.ms || 0) - (b.ms || 0))
}

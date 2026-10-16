import { SOLAR_SYSTEM } from './data/solarSystem'

// Placeholder until the 3D scene exists: lists the bodies from the data file.
function App() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>Solar System Explorer</h1>
      <p>3D scene coming soon. Bodies loaded from the data file:</p>
      <ul>
        {SOLAR_SYSTEM.map((body) => (
          <li key={body.id}>
            <strong style={{ color: body.color }}>{body.name}</strong> — {body.tagline} ({body.pois.length} POI
            {body.pois.length === 1 ? '' : 's'})
          </li>
        ))}
      </ul>
    </main>
  )
}

export default App

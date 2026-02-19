import EinsatzdetailsSection from './sections/EinsatzdetailsSection'
import TruppstaerkeSection from './sections/TruppstaerkeSection'

export default function EinsatzdatenPhase() {
  return (
    <div className="space-y-4">
      <EinsatzdetailsSection />
      <TruppstaerkeSection />
    </div>
  )
}

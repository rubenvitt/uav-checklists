import EinsatzdetailsSection from './sections/EinsatzdetailsSection'
import EinsatzauftragSection from './sections/EinsatzauftragSection'
import TruppstaerkeSection from './sections/TruppstaerkeSection'

export default function EinsatzdatenPhase() {
  return (
    <div className="space-y-4">
      <EinsatzdetailsSection />
      <EinsatzauftragSection />
      <TruppstaerkeSection />
    </div>
  )
}

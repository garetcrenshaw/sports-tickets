import { Link } from 'react-router-dom'

export default function TypographyGuide() {
  return (
    <div className="typography-guide">
      <div className="typography-guide__header">
        <Link to="/" className="typography-guide__back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to Home
        </Link>
        <h1>Typography & Copy Style Guide</h1>
        <p>All text styles used across the platform. Edit styles in <code>src/App.css</code></p>
      </div>

      <div className="typography-guide__content">
        {/* Home Page Styles */}
        <section className="typography-section">
          <h2 className="typography-section__title">Home Page</h2>
          
          <div className="typography-item">
            <div className="typography-item__label">Hero Title</div>
            <div className="typography-item__preview typography-item__preview--hero-title">
              GAMEDAY TICKETS
            </div>
            <div className="typography-item__specs">
              Font: Anton | Size: clamp(3.5rem, 14vw, 11rem) | Weight: 400 | Color: White
            </div>
          </div>

          <div className="typography-item">
            <div className="typography-item__label">Hero Subtitle</div>
            <div className="typography-item__preview typography-item__preview--hero-subtitle">
              The simplest way to buy, send, and scan event tickets. Digital passes delivered instantly to your inbox.
            </div>
            <div className="typography-item__specs">
              Font: DM Sans | Size: clamp(1rem, 2.5vw, 1.3rem) | Weight: 400 | Color: rgba(255, 255, 255, 0.4)
            </div>
          </div>

          <div className="typography-item">
            <div className="typography-item__label">Section Titles</div>
            <div className="typography-item__preview typography-item__preview--section-title">
              GAMEDAY MADE EASY
            </div>
            <div className="typography-item__specs">
              Font: Anton | Size: clamp(3rem, 8vw, 6rem) | Weight: 400 | Color: White
            </div>
          </div>

          <div className="typography-item">
            <div className="typography-item__label">Feature Card Titles</div>
            <div className="typography-item__preview typography-item__preview--feature-title">
              INSTANT PURCHASE
            </div>
            <div className="typography-item__specs">
              Font: Anton | Size: 1.6rem | Weight: 400 | Color: White
            </div>
          </div>
        </section>

        {/* Events Page Styles */}
        <section className="typography-section">
          <h2 className="typography-section__title">Events Page</h2>
          
          <div className="typography-item">
            <div className="typography-item__label">Page Title</div>
            <div className="typography-item__preview typography-item__preview--events-title">
              FIND YOUR EVENT
            </div>
            <div className="typography-item__specs">
              Font: Anton | Size: clamp(2.5rem, 7vw, 5rem) | Weight: 400 | Color: White
            </div>
          </div>

          <div className="typography-item">
            <div className="typography-item__label">Event Card Name</div>
            <div className="typography-item__preview typography-item__preview--event-card-name">
              GAMEDAY EMPIRE SHOWCASE
            </div>
            <div className="typography-item__specs">
              Font: DM Sans | Size: 1.5rem | Weight: 600 | Color: White
            </div>
          </div>
        </section>

        {/* Buy Page Styles */}
        <section className="typography-section">
          <h2 className="typography-section__title">Buy Page</h2>
          
          <div className="typography-item">
            <div className="typography-item__label">Page Title</div>
            <div className="typography-item__preview typography-item__preview--buy-title">
              GAMEDAY EMPIRE SHOWCASE
            </div>
            <div className="typography-item__specs">
              Font: DM Sans | Size: clamp(1.8rem, 4vw, 2.5rem) | Weight: 700 | Color: White
            </div>
          </div>

          <div className="typography-item">
            <div className="typography-item__label">Order Summary Header</div>
            <div className="typography-item__preview typography-item__preview--order-summary">
              ORDER SUMMARY
            </div>
            <div className="typography-item__specs">
              Font: DM Sans | Size: 1rem | Weight: 700 | Color: Orange (#f97316) | Uppercase
            </div>
          </div>

          <div className="typography-item">
            <div className="typography-item__label">Admission/Parking Labels</div>
            <div className="typography-item__preview typography-item__preview--ticket-label">
              ADMISSION TICKETS
            </div>
            <div className="typography-item__specs">
              Font: DM Sans | Size: 1rem | Weight: 700 | Color: White | Uppercase
            </div>
          </div>

          <div className="typography-item">
            <div className="typography-item__label">Quantity Label</div>
            <div className="typography-item__preview typography-item__preview--quantity-label">
              QUANTITY
            </div>
            <div className="typography-item__specs">
              Font: DM Sans | Size: 0.85rem | Weight: 400 | Color: rgba(255, 255, 255, 0.4) | Uppercase
            </div>
          </div>

          <div className="typography-item">
            <div className="typography-item__label">Summary Row Text</div>
            <div className="typography-item__preview typography-item__preview--summary-row">
              ADMISSION TICKETS (2)
            </div>
            <div className="typography-item__specs">
              Font: DM Sans | Size: 1rem | Weight: 700 | Color: White | Uppercase
            </div>
          </div>

          <div className="typography-item">
            <div className="typography-item__label">Complete Purchase Button</div>
            <div className="typography-item__preview typography-item__preview--button">
              COMPLETE PURCHASE
            </div>
            <div className="typography-item__specs">
              Font: DM Sans | Size: 1rem | Weight: 700 | Color: White | Background: Orange (#f97316) | Uppercase
            </div>
          </div>
        </section>

        {/* Portal Styles */}
        <section className="typography-section">
          <h2 className="typography-section__title">Parent Portal</h2>
          
          <div className="typography-item">
            <div className="typography-item__label">Portal Section Title</div>
            <div className="typography-item__preview typography-item__preview--portal-section">
              SELECT TICKETS
            </div>
            <div className="typography-item__specs">
              Font: DM Sans | Size: 1rem | Weight: 700 | Color: White | Uppercase
            </div>
          </div>

          <div className="typography-item">
            <div className="typography-item__label">Portal Item Name</div>
            <div className="typography-item__preview typography-item__preview--portal-item">
              ADMISSION TICKETS
            </div>
            <div className="typography-item__specs">
              Font: DM Sans | Size: 1rem | Weight: 700 | Color: White | Uppercase
            </div>
          </div>

          <div className="typography-item">
            <div className="typography-item__label">Portal Summary Row</div>
            <div className="typography-item__preview typography-item__preview--portal-summary">
              SUBTOTAL
            </div>
            <div className="typography-item__specs">
              Font: DM Sans | Size: 1rem | Weight: 700 | Color: White | Uppercase
            </div>
          </div>
        </section>

        {/* Body Text Styles */}
        <section className="typography-section">
          <h2 className="typography-section__title">Body Text</h2>
          
          <div className="typography-item">
            <div className="typography-item__label">Regular Body Text</div>
            <div className="typography-item__preview typography-item__preview--body">
              This is regular body text used throughout the site for descriptions and general content.
            </div>
            <div className="typography-item__specs">
              Font: DM Sans | Size: 1rem | Weight: 400 | Color: rgba(255, 255, 255, 0.7)
            </div>
          </div>

          <div className="typography-item">
            <div className="typography-item__label">Muted Text</div>
            <div className="typography-item__preview typography-item__preview--muted">
              This is muted text for secondary information
            </div>
            <div className="typography-item__specs">
              Font: DM Sans | Size: 0.9rem | Weight: 400 | Color: rgba(255, 255, 255, 0.4)
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}


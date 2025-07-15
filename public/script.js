// Global variables
let currentSection = 0
const sections = ["home", "about", "projects", "topics", "skills", "join"]
let isScrolling = false

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  initializeCustomCursor()
  initializeBackgroundCanvas()
  initializeNavigation()
  initializeScrolling()
  initializeContactForm()
  initializeAnimations()
})

// Custom Cursor
function initializeCustomCursor() {
  const cursor = document.querySelector(".cursor")
  const cursorFollower = document.querySelector(".cursor-follower")

  if (!cursor || !cursorFollower) return

  let mouseX = 0,
    mouseY = 0
  let followerX = 0,
    followerY = 0

  document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX
    mouseY = e.clientY

    cursor.style.transform = `translate(${mouseX - 8}px, ${mouseY - 8}px)`
  })

  // Smooth follower animation
  function animateFollower() {
    followerX += (mouseX - followerX) * 0.1
    followerY += (mouseY - followerY) * 0.1

    cursorFollower.style.transform = `translate(${followerX - 16}px, ${followerY - 16}px)`
    requestAnimationFrame(animateFollower)
  }
  animateFollower()

  // Hover effects
  const interactiveElements = document.querySelectorAll("a, button, input, textarea, .project-card")
  interactiveElements.forEach((el) => {
    el.addEventListener("mouseenter", () => {
      cursor.style.transform += " scale(1.5)"
      cursorFollower.style.transform += " scale(2)"
    })

    el.addEventListener("mouseleave", () => {
      cursor.style.transform = cursor.style.transform.replace(" scale(1.5)", "")
      cursorFollower.style.transform = cursorFollower.style.transform.replace(" scale(2)", "")
    })
  })
}

// Background Canvas Animation
function initializeBackgroundCanvas() {
  const canvas = document.getElementById("background-canvas")
  if (!canvas) return

  const ctx = canvas.getContext("2d")
  let particles = []

  function resizeCanvas() {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }

  function createParticles() {
    particles = []
    const particleCount = Math.min(150, Math.floor((canvas.width * canvas.height) / 10000))

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.8 + 0.2,
      })
    }
  }

  function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    particles.forEach((particle) => {
      particle.x += particle.vx
      particle.y += particle.vy

      if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1
      if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1

      ctx.beginPath()
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, 107, 53, ${particle.opacity})`
      ctx.fill()
    })

    requestAnimationFrame(animateParticles)
  }

  resizeCanvas()
  createParticles()
  animateParticles()

  window.addEventListener("resize", () => {
    resizeCanvas()
    createParticles()
  })
}

// Navigation
function initializeNavigation() {
  const navLinks = document.querySelectorAll(".nav-list a, .mobile-nav-menu a")
  const navDots = document.querySelectorAll(".nav-dot")
  const mobileToggle = document.querySelector(".mobile-nav-toggle")
  const mobileMenu = document.querySelector(".mobile-nav-menu")

  // Navigation click handlers
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault()
      const targetSection = link.getAttribute("data-section")
      scrollToSection(targetSection)

      if (mobileMenu) {
        mobileMenu.style.display = "none"
      }
    })
  })

  navDots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const targetSection = dot.getAttribute("data-section")
      scrollToSection(targetSection)
    })
  })

  // Mobile menu toggle
  if (mobileToggle && mobileMenu) {
    mobileToggle.addEventListener("click", () => {
      mobileMenu.style.display = mobileMenu.style.display === "block" ? "none" : "block"
    })
  }

  updateActiveNavigation()
}

// Scrolling
function initializeScrolling() {
  const scrollContainer = document.getElementById("scroll-container")
  if (!scrollContainer) return

  scrollContainer.addEventListener("scroll", () => {
    if (isScrolling) return

    const scrollLeft = scrollContainer.scrollLeft
    const sectionWidth = window.innerWidth
    const newSection = Math.round(scrollLeft / sectionWidth)

    if (newSection !== currentSection && newSection >= 0 && newSection < sections.length) {
      currentSection = newSection
      updateActiveNavigation()
      updateProgressBar()
      triggerSectionAnimations()
    }
  })

  // Keyboard navigation
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" && currentSection < sections.length - 1) {
      scrollToSection(sections[currentSection + 1])
    } else if (e.key === "ArrowLeft" && currentSection > 0) {
      scrollToSection(sections[currentSection - 1])
    }
  })
}

function scrollToSection(sectionName) {
  const sectionIndex = sections.indexOf(sectionName)
  if (sectionIndex === -1) return

  const scrollContainer = document.getElementById("scroll-container")
  if (!scrollContainer) return

  isScrolling = true
  currentSection = sectionIndex

  scrollContainer.scrollTo({
    left: sectionIndex * window.innerWidth,
    behavior: "smooth",
  })

  setTimeout(() => {
    isScrolling = false
    updateActiveNavigation()
    updateProgressBar()
    triggerSectionAnimations()
  }, 500)
}

function updateActiveNavigation() {
  // Update nav links
  document.querySelectorAll(".nav-list a, .mobile-nav-menu a").forEach((link) => {
    link.classList.remove("active")
    if (link.getAttribute("data-section") === sections[currentSection]) {
      link.classList.add("active")
    }
  })

  // Update nav dots
  document.querySelectorAll(".nav-dot").forEach((dot, index) => {
    dot.classList.remove("active")
    if (index === currentSection) {
      dot.classList.add("active")
    }
  })
}

function updateProgressBar() {
  const progressBar = document.querySelector(".progress-bar")
  if (progressBar) {
    const progress = ((currentSection + 1) / sections.length) * 100
    progressBar.style.width = `${progress}%`
  }
}

// Contact Form
function initializeContactForm() {
  const form = document.getElementById("contact-form")
  if (!form) return

  form.addEventListener("submit", async (e) => {
    e.preventDefault()

    const formData = new FormData(form)
    const data = {
      name: formData.get("name"),
      email: formData.get("email"),
      message: formData.get("message"),
    }

    const submitBtn = form.querySelector(".submit-btn")
    const btnText = submitBtn.querySelector(".btn-text")
    const spinner = submitBtn.querySelector(".loading-spinner")
    const statusDiv = document.getElementById("form-status")

    // Show loading state
    submitBtn.disabled = true
    btnText.textContent = "Sending..."
    spinner.style.display = "block"
    statusDiv.style.display = "none"

    try {
      const response = await fetch("/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (response.ok) {
        statusDiv.textContent = result.message
        statusDiv.className = "form-status success"
        statusDiv.style.display = "block"
        form.reset()
      } else {
        const errorMessage = result.errors ? result.errors.join(", ") : result.message
        statusDiv.textContent = errorMessage
        statusDiv.className = "form-status error"
        statusDiv.style.display = "block"
      }
    } catch (error) {
      statusDiv.textContent = "Network error. Please check your connection and try again."
      statusDiv.className = "form-status error"
      statusDiv.style.display = "block"
    } finally {
      // Reset button state
      submitBtn.disabled = false
      btnText.textContent = "Apply Now"
      spinner.style.display = "none"
    }
  })
}

// Animations
function initializeAnimations() {
  // Animate skill bars when skills section is visible
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const skillBars = entry.target.querySelectorAll(".skill-progress")
          skillBars.forEach((bar) => {
            const width = bar.getAttribute("data-width")
            setTimeout(() => {
              bar.style.width = `${width}%`
            }, 200)
          })
        }
      })
    },
    { threshold: 0.5 },
  )

  const skillsSection = document.getElementById("skills")
  if (skillsSection) {
    observer.observe(skillsSection)
  }
}

function triggerSectionAnimations() {
  const currentSectionElement = document.getElementById(sections[currentSection])
  if (!currentSectionElement) return

  // Add animation classes or trigger specific animations based on section
  currentSectionElement.classList.add("section-active")

  // Remove animation class from other sections
  sections.forEach((sectionName, index) => {
    if (index !== currentSection) {
      const sectionElement = document.getElementById(sectionName)
      if (sectionElement) {
        sectionElement.classList.remove("section-active")
      }
    }
  })
}

// Utility functions
function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Handle window resize
window.addEventListener(
  "resize",
  debounce(() => {
    // Recalculate scroll position on resize
    const scrollContainer = document.getElementById("scroll-container")
    if (scrollContainer) {
      scrollContainer.scrollLeft = currentSection * window.innerWidth
    }
  }, 250),
)

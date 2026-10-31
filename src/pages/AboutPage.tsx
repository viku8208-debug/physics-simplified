import { Link } from 'react-router-dom'
import { ArrowRight, Atom, Compass, Lightbulb, Sparkles, Target, ExternalLink, GraduationCap, BookOpenCheck } from 'lucide-react'
import { PageBanner } from '../components/Common'

const qualifications = ['M.Sc. Physics', 'B.Ed.', 'CTET Qualified', 'STET Qualified']
const subjects = ['Physics', 'Chemistry', 'Biology', 'General Science', 'Mathematics']
const languages = ['Hindi', 'English', 'Hinglish']

export function AboutPage() {
  return (
    <>
      <PageBanner kicker="CONCEPT TO CLARITY BY SURAJ BHARDWAJ" title="Science made simple, logical and interesting." description="A learning space built around conceptual teaching, activity-based learning, practical examples and clear explanations." icon={<Atom size={30} />} />
      <section className="shell about-section">
        <div className="about-main">
          <span className="eyebrow">MEET YOUR TEACHER</span>
          <h2>Suraj <span>Bhardwaj.</span></h2>
          <p className="about-lede">Science Educator &amp; Physics Teacher Â· 7 years of teaching experience (2019â€“present)</p>
          <p>Suraj Bhardwaj is a passionate science educator who specialises in Physics and activity-based learning. His teaching uses practical examples, demonstrations and simple explanations to make difficult ideas easier to understand.</p>
          <p>His focus is on conceptual clarity, logical thinking and connecting classroom science to everyday life. The aim is not only to prepare students f¶»§q«^
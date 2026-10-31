import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export type Language = 'en' | 'hi'

const translations: Record<string, { en: string; hi: string }> = {
  home: { en: 'Home', hi: 'होम' },
  notes: { en: 'Notes', hi: 'नोट्स' },
  videos: { en: 'Videos', hi: 'वीडियो' },
  resources: { en: 'Resources', hi: 'संसाधन' },
  quizzes: { en: 'Quizzes', hi: 'क्विज़' },
  about: { en: 'About', hi: 'परिचय' },
  contact: { en: 'Contact', hi: 'संपर्क' },
  teacher: { en: 'Teacher login', hi: 'शिक्षक लॉगिन' },
  signIn: { en: 'Student sign in', hi: 'छात्र लॉगिन' },
  exploreNotes: { en: 'Explore notes', hi: 'नोट्स देखें' },
  watchLessons: { en: 'Watch lessons', hi: 'वीडियो देखें' },
  learnMore: { en: 'Learn more', hi: 'और जानें' },
  search: { en: 'Search by topic, chapter or keyword…', hi: 'टॉपिक, अध्याय या शब्द खोजें…' },
  allClasses: { en: 'All classes', hi: 'सभी कक्षाएँ' },
  allSubjects: { en: 'All subjects', hi: 'सभी विषय' },
  noNotes: { en: 'Your notes library is getting ready.', hi: 'नोट्स लाइब्रेरी जल्द तैयार होगी।' },
  noVideos: { en: 'No video lessons have been published yet.', hi: 'अभी कोई वीडियो लेसन श��q�^
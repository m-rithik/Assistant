"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import VtopLogin from "../components/VtopLogin";

const QUICK_ACTIONS = [
  { label: "Faculty", fill: "Who is devipriya a ma'am" },
  { label: "Clubs", fill: "What's csed club?" },
  { label: "Exams", fill: "List upcoming exams and dates" },
  { label: "Assignments", fill: "Any assignments due this week?" },
  { label: "Course Materials", fill: "Provide my course materials for DSA" },
  { label: "Mess Menu", fill: "Show me today's mess menu" },
  { label: "Club Events", fill: "Show club events happening this weekend" },
  { label: "Fees", fill: "Fees due and last payment date" },
  { label: "My Attendance", fill: "Show my attendance" },
  { label: "My Assignments", fill: "Show my digital assignments" },
];

const BOT_NAME = "VIT Bot";

export default function HomePage() {
  const { isSignedIn } = useUser();

  useEffect(() => {
    const className = "body--landing";
    const body = document.body;
    if (!isSignedIn) {
      body.classList.add(className);
    } else {
      body.classList.remove(className);
    }
    return () => body.classList.remove(className);
  }, [isSignedIn]);

  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [showSemesterDropdown, setShowSemesterDropdown] = useState(false);
  const [availableSemesters, setAvailableSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseDetails, setCourseDetails] = useState(null);
  const [courseDetailsLoading, setCourseDetailsLoading] = useState(false);
  const [facultySearchLoading, setFacultySearchLoading] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [facultyDetails, setFacultyDetails] = useState(null);
  const [facultyDetailsLoading, setFacultyDetailsLoading] = useState(false);
  const [messOptionsLoading, setMessOptionsLoading] = useState(false);
  const [messOptions, setMessOptions] = useState(null);
  const [selectedHostelType, setSelectedHostelType] = useState(null);
  const [selectedMessType, setSelectedMessType] = useState(null);
  const [messMenuLoading, setMessMenuLoading] = useState(false);
  const [messMenu, setMessMenu] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const inputRef = useRef(null);

  // Function to reset mess menu state
  const resetMessMenuState = () => {
    setMessOptions(null);
    setSelectedHostelType(null);
    setSelectedMessType(null);
    setMessMenu(null);
    setSelectedDate(null);
    setMessOptionsLoading(false);
    setMessMenuLoading(false);
  };

  // Function to reset messit session
  const resetMessitSession = async () => {
    try {
      await fetch('/api/mess', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      console.log('Messit session reset successfully');
    } catch (error) {
      console.error('Error resetting messit session:', error);
    }
  };

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(""), 1500);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const heroSubtitle = useMemo(
    () =>
      loading
        ? "Hang tight while I pull that up for you."
        : "Pick a quick action or just ask me anything about campus life. I am listening.",
    [loading]
  );

  async function fetchDigitalAssignments(semesterLabel = null) {
    setAssignmentsLoading(true);
    
    try {
      const url = semesterLabel ? "/api/vtop/assignments" : "/api/vtop/assignments";
      const method = semesterLabel ? "POST" : "GET";
      const body = semesterLabel ? JSON.stringify({ semesterLabel }) : undefined;
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body,
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch assignments");
      }
      
      if (data.success) {
        console.log('Received assignments data:', data);
        console.log('Assignments:', data.assignments);
        
        setAvailableSemesters(data.semesters || []);
        setSelectedSemester(data.semester);
        
        // Add assignments to messages
        const assignmentsContent = data.assignments.length > 0 
          ? formatAssignmentsForChat(data.assignments, data.semester)
          : "No assignments found for this semester.";
          
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: assignmentsContent,
            assignments: data.assignments,
            semester: data.semester,
            semesters: data.semesters,
            showSemesterDropdown: data.semesters && data.semesters.length > 1 && data.semester?.label !== 'Fall Semester 2025-26',
          },
        ]);
        
        setShowSemesterDropdown(data.semesters && data.semesters.length > 1 && data.semester?.label !== 'Fall Semester 2025-26');
      }
    } catch (err) {
      setMessages((prev) => [...prev, { 
        role: "assistant", 
        content: `Failed to fetch assignments: ${err.message}` 
      }]);
    } finally {
      setAssignmentsLoading(false);
    }
  }

  function formatAssignmentsForChat(assignments, semester) {
    let content = `📝 **Digital Assignments**\n\n`;
    
    if (assignments.length === 0) {
      return content + "No assignments found for this semester.";
    }
    
    content += `Found ${assignments.length} courses with assignments:\n\n`;
    
    assignments.forEach((assignment, index) => {
      content += `${index + 1}. **${assignment.courseCode}** - ${assignment.courseTitle}\n`;
      content += `   📚 Type: ${assignment.courseType || 'Not specified'}\n`;
      content += `   👨‍🏫 Faculty: ${assignment.facultyName || 'Not specified'}\n\n`;
    });
    
    return content;
  }

  async function fetchCourseDetails(classId) {
    setCourseDetailsLoading(true);
    
    try {
      const res = await fetch("/api/vtop/assignment-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ classId }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch course details");
      }
      
      if (data.success) {
        setCourseDetails(data);
        
        // Add course details to messages
        const detailsContent = formatCourseDetailsForChat(data);
        
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: detailsContent,
            courseDetails: data,
            showCourseDetails: true,
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, { 
        role: "assistant", 
        content: `Failed to fetch course details: ${err.message}` 
      }]);
    } finally {
      setCourseDetailsLoading(false);
    }
  }

  function formatCourseDetailsForChat(details) {
    if (!details.courseInfo || !details.assignments) {
      return "No course details found.";
    }
    
    let content = `📚 **Course Details - ${details.courseInfo.courseCode}**\n`;
    content += `**${details.courseInfo.courseTitle}**\n`;
    content += `📋 Type: ${details.courseInfo.courseType}\n`;
    content += `🏫 Class: ${details.courseInfo.classNumber}\n\n`;
    
    if (details.assignments.length === 0) {
      content += "No assignments found for this course.";
    } else {
      content += `**Assignments (${details.assignments.length}):**\n\n`;
      details.assignments.forEach((assignment, index) => {
        content += `${index + 1}. **${assignment.title}**\n`;
        content += `   📅 Due: ${assignment.dueDate}\n`;
        content += `   📊 Max Marks: ${assignment.maxMark}\n`;
        content += `   ⚖️ Weightage: ${assignment.weightage}\n`;
        content += `   📝 Last Updated: ${assignment.lastUpdated}\n\n`;
      });
    }
    
    return content;
  }

  async function fetchFacultySearch(searchQuery) {
    setFacultySearchLoading(true);
    
    try {
      const res = await fetch("/api/vtop/faculty-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ searchQuery }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to search faculty");
      }
      
      if (data.success) {
        console.log('Received faculty search data:', data);
        
        // Add faculty search results to messages
        const facultyContent = data.results.length > 0 
          ? formatFacultySearchForChat(data.results, data.searchQuery)
          : `No faculty found matching "${data.searchQuery}". Please try a different search term.`;
          
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: facultyContent,
            facultyResults: data.results,
            searchQuery: data.searchQuery,
            showFacultyDropdown: data.results.length > 0,
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, { 
        role: "assistant", 
        content: `Failed to search faculty: ${err.message}` 
      }]);
    } finally {
      setFacultySearchLoading(false);
    }
  }

  function formatFacultySearchForChat(facultyResults, searchQuery) {
    let content = `👨‍🏫 **Faculty Search Results**\n\n`;
    content += `Search query: "${searchQuery}"\n`;
    content += `Found ${facultyResults.length} faculty member(s):\n\n`;
    
    facultyResults.forEach((faculty, index) => {
      content += `${index + 1}. **${faculty.name}**\n`;
      content += `   📋 Designation: ${faculty.designation || 'Not specified'}\n`;
      content += `   🏫 School: ${faculty.school || 'Not specified'}\n`;
      content += `   🆔 Employee ID: ${faculty.employeeId}\n\n`;
    });
    
    return content;
  }

  async function fetchFacultyDetails(employeeId) {
    setFacultyDetailsLoading(true);
    
    try {
      const res = await fetch("/api/vtop/faculty-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ employeeId }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch faculty details");
      }
      
      if (data.success) {
        setFacultyDetails(data);
        
        // Add faculty details to messages
        const detailsContent = formatFacultyDetailsForChat(data);
        
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: detailsContent,
            facultyDetails: data,
            showFacultyDetails: true,
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, { 
        role: "assistant", 
        content: `Failed to fetch faculty details: ${err.message}` 
      }]);
    } finally {
      setFacultyDetailsLoading(false);
    }
  }

  function formatFacultyDetailsForChat(details) {
    if (!details.details) {
      return "No faculty details found.";
    }
    
    const faculty = details.details;
    let content = `👨‍🏫 **Faculty Details**\n\n`;
    
    // Add photo if available
    if (faculty.photoUrl) {
      content += `![Faculty Photo](${faculty.photoUrl})\n\n`;
    }
    
    content += `**${faculty.name || 'Name not available'}**\n`;
    content += `📋 Designation: ${faculty.designation || 'Not specified'}\n`;
    content += `🏫 Department: ${faculty.department || 'Not specified'}\n`;
    content += `🏛️ School: ${faculty.school || 'Not specified'}\n`;
    content += `📧 Email: ${faculty.email || 'Not specified'}\n`;
    content += `🚪 Cabin: ${faculty.cabin || 'Not specified'}\n\n`;
    
    if (faculty.openHours && faculty.openHours.length > 0) {
      content += `**Office Hours:**\n`;
      faculty.openHours.forEach((hours) => {
        content += `• ${hours.day}: ${hours.timing}\n`;
      });
    } else {
      content += `**Office Hours:** Not specified\n`;
    }
    
    return content;
  }

  async function fetchMessOptions() {
    // Reset mess menu state when fetching new options
    resetMessMenuState();
    setMessOptionsLoading(true);
    
    try {
      const res = await fetch("/api/mess", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      
      // Check if response is JSON
      const contentType = res.headers.get("content-type");
      let data;
      
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        // If not JSON, get text response
        const text = await res.text();
        console.error("Non-JSON response from mess API:", text);
        throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}...`);
      }
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch mess options");
      }
      
      if (data.success) {
        console.log('Received mess options:', data);
        
        setMessOptions(data);
        
        const optionsContent = formatMessOptionsForChat(data);
        
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: optionsContent,
            messOptions: data,
            showMessOptions: true,
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, { 
        role: "assistant", 
        content: `Failed to fetch mess options: ${err.message}` 
      }]);
    } finally {
      setMessOptionsLoading(false);
    }
  }

  function formatMessOptionsForChat(options) {
    let content = `🍽️ **Mess Menu Options**\n\n`;
    
    content += `**Available Hostel Types:**\n`;
    options.hostelTypes.forEach((hostel, index) => {
      content += `${index + 1}. ${hostel.label || hostel.name}\n`;
    });
    
    content += `\n**Available Mess Types:**\n`;
    options.messTypes.forEach((mess, index) => {
      content += `${index + 1}. ${mess.label || mess.name}\n`;
    });
    
    content += `\nPlease select your hostel type and mess type to view the menu.`;
    
    return content;
  }

  async function fetchMessMenu(hostelType, messType, date = null) {
    setMessMenuLoading(true);
    
    try {
      // First try client-side scraping
      if (typeof window !== 'undefined') {
        console.log('🌐 Attempting client-side scraping...');
        try {
          const clientData = await performClientSideScraping(hostelType, messType, date);
          if (clientData && clientData.meals) {
            console.log('✅ Client-side scraping successful');
            setMessMenu(clientData);
            setSelectedDate(clientData.selectedDate);
            return;
          }
        } catch (clientError) {
          console.warn('⚠ Client-side scraping failed, falling back to server:', clientError.message);
        }
      }

      // Fallback to server-side API
      console.log('🔄 Using server-side API...');
      const res = await fetch("/api/mess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          hostelType, 
          messType,
          selectedDate: date
        }),
      });
      
      // Check if response is JSON
      const contentType = res.headers.get("content-type");
      let data;
      
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        // If not JSON, get text response
        const text = await res.text();
        console.error("Non-JSON response from mess menu API:", text);
        throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}...`);
      }
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch mess menu");
      }
      
      if (data.success) {
        console.log('Received mess menu:', data);
        
        setMessMenu(data);
        setSelectedDate(data.selectedDate);
        
        // Only add the menu content if it's a new request or different date
        const lastMessage = messages[messages.length - 1];
        const isNewRequest = !lastMessage || 
                           !lastMessage.messMenu || 
                           lastMessage.messMenu.hostelType !== data.hostelType ||
                           lastMessage.messMenu.messType !== data.messType ||
                           lastMessage.messMenu.selectedDate !== data.selectedDate;
        
        if (isNewRequest) {
          // Only add the styled UI component, not the text message
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "", // Empty content - we'll show the UI instead
              messMenu: data,
              showMessMenu: true,
            },
          ]);
        }
      }
    } catch (err) {
      setMessages((prev) => [...prev, { 
        role: "assistant", 
        content: `Failed to fetch mess menu: ${err.message}` 
      }]);
    } finally {
      setMessMenuLoading(false);
    }
  }

  // Client-side scraping function
  async function performClientSideScraping(hostelType, messType, date) {
    try {
      console.log('🌐 Starting client-side mess menu scraping...');
      
      // Use a CORS proxy (you might need to enable it at https://cors-anywhere.herokuapp.com/corsdemo)
      const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
      const targetUrl = 'https://messit.vinnovateit.com/details';
      
      const response = await fetch(proxyUrl + targetUrl, {
        method: 'GET',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      console.log('✅ HTML fetched, length:', html.length);

      // Parse HTML using DOMParser (browser native)
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Extract mess menu data
      const menuData = extractMenuFromHTML(doc, date);
      
      console.log('✅ Menu extracted:', menuData);
      return menuData;

    } catch (error) {
      console.error('❌ Client scraping failed:', error);
      throw error;
    }
  }

  // Extract menu data from HTML
  function extractMenuFromHTML(doc, dayNumber) {
    const meals = {
      breakfast: [],
      lunch: [],
      snacks: [],
      dinner: []
    };

    try {
      // Look for meal sections in the HTML
      const mealSections = doc.querySelectorAll('section.grid > div, .meal-section, [class*="meal"]');
      
      console.log('Found meal sections:', mealSections.length);

      mealSections.forEach((section, index) => {
        const titleElement = section.querySelector('h2, h3, .meal-title, [class*="title"]');
        const itemsElement = section.querySelector('p, .meal-items, [class*="items"]');
        
        if (!titleElement || !itemsElement) return;

        const title = titleElement.textContent.trim().toLowerCase();
        const items = itemsElement.textContent
          .split(',')
          .map(item => item.trim())
          .filter(item => item.length > 0);

        // Map to meal types
        if (title.includes('breakfast')) {
          meals.breakfast = items;
        } else if (title.includes('lunch')) {
          meals.lunch = items;
        } else if (title.includes('snacks') || title.includes('snack')) {
          meals.snacks = items;
        } else if (title.includes('dinner')) {
          meals.dinner = items;
        }
      });

      // Generate available dates
      const availableDates = generateAvailableDates();

      // Transform to expected format
      const menuItems = [];
      const mealTimes = {
        breakfast: '7:00 AM - 9:00 AM',
        lunch: '12:30 PM - 2:30 PM',
        snacks: '4:30 PM - 6:15 PM',
        dinner: '7:00 PM - 9:00 PM'
      };

      if (meals.breakfast.length > 0) {
        menuItems.push({
          meal: 'Breakfast',
          items: meals.breakfast,
          time: mealTimes.breakfast
        });
      }
      
      if (meals.lunch.length > 0) {
        menuItems.push({
          meal: 'Lunch',
          items: meals.lunch,
          time: mealTimes.lunch
        });
      }
      
      if (meals.snacks.length > 0) {
        menuItems.push({
          meal: 'Snacks',
          items: meals.snacks,
          time: mealTimes.snacks
        });
      }
      
      if (meals.dinner.length > 0) {
        menuItems.push({
          meal: 'Dinner',
          items: meals.dinner,
          time: mealTimes.dinner
        });
      }

      const today = new Date();
      const dayNumber = today.getDate();

      return {
        success: true,
        date: today.toISOString().split('T')[0],
        dayName: today.toLocaleDateString('en-US', { weekday: 'long' }),
        hostelType: 'MH',
        messType: 'Non-Veg',
        currentMonth: today.toLocaleDateString('en-US', { month: 'long' }),
        currentYear: today.getFullYear(),
        selectedDate: dayNumber,
        availableDates,
        isRealTime: true,
        menuItems,
        source: 'client-side-scraping'
      };

    } catch (error) {
      console.error('Error extracting menu:', error);
      throw error;
    }
  }

  // Generate available dates for the current month
  function generateAvailableDates() {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const todayDay = today.getDate();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const availableDates = [];
    for (let day = 1; day <= daysInMonth; day++) {
      availableDates.push({
        dayNumber: day,
        isToday: day === todayDay,
        date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      });
    }

    return availableDates;
  }

  function formatMessMenuForChat(menuData) {
    if (!menuData || menuData.error) {
      return `🍽️ **Mess Menu**\n\n❌ Failed to load mess menu. Please try again later.`;
    }

    let content = `🍽️ **Mess Menu**\n\n`;
    
    content += `📅 **${menuData.dayName}, ${menuData.date}**\n\n`;
    
    content += `🏠 **Hostel:** ${menuData.hostelType || 'Not specified'}\n`;
    content += `🍴 **Mess Type:** ${menuData.messType || 'Not specified'}\n`;
    content += `📆 **Date:** Day ${menuData.selectedDate}\n\n`;

    if (menuData.menuItems && menuData.menuItems.length > 0) {
      menuData.menuItems.forEach((meal) => {
        content += `**${meal.meal}:**\n`;
        meal.items.forEach((item) => {
          content += `• ${item}\n`;
        });
        content += `\n`;
      });
    } else {
      content += `📝 **Menu information is currently unavailable.**\n`;
      content += `Please try again later or select a different mess type.`;
    }

    return content;
  }

  async function submitPrompt(currentPrompt) {
    const trimmed = currentPrompt.trim();
    if (!trimmed) return;

    // Check if this is a digital assignments request (very specific detection)
    const lowerTrimmed = trimmed.toLowerCase();
    const isAssignmentsRequest = lowerTrimmed.includes('digital assignment') || 
                                lowerTrimmed.includes('digital assignments') ||
                                lowerTrimmed === 'da' ||
                                lowerTrimmed === 'assignments' ||
                                (lowerTrimmed.includes('assignment') && 
                                 !lowerTrimmed.includes('attendance') &&
                                 !lowerTrimmed.includes('show my') &&
                                 !lowerTrimmed.includes('my attendance') &&
                                 !lowerTrimmed.includes('attendance') &&
                                 !lowerTrimmed.includes('show') &&
                                 !lowerTrimmed.includes('my'));

    // Check if this is a faculty search request
    const isFacultySearchRequest = lowerTrimmed.includes('faculty') ||
                                   lowerTrimmed.includes('professor') ||
                                   lowerTrimmed.includes('teacher') ||
                                   lowerTrimmed.includes('instructor') ||
                                   lowerTrimmed.includes('who is') ||
                                   lowerTrimmed.includes('search faculty') ||
                                   lowerTrimmed.includes('find faculty') ||
                                   (lowerTrimmed.includes('devipriya') || 
                                    lowerTrimmed.includes('thamil') || 
                                    lowerTrimmed.includes('siva') || 
                                    lowerTrimmed.includes('lakshmi') || 
                                    lowerTrimmed.includes('ranjith') || 
                                    lowerTrimmed.includes('murugan'));

    // Check if this is a mess menu request
    const isMessMenuRequest = lowerTrimmed.includes('mess menu') ||
                              lowerTrimmed.includes('mess') ||
                              lowerTrimmed.includes('cafeteria') ||
                              lowerTrimmed.includes('food') ||
                              lowerTrimmed.includes('menu') ||
                              lowerTrimmed.includes('dining') ||
                              lowerTrimmed.includes('hostel food') ||
                              lowerTrimmed.includes('what to eat') ||
                              lowerTrimmed.includes('today menu') ||
                              lowerTrimmed.includes('messit');

    if (isAssignmentsRequest) {
      setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
      setToast(`→ ${trimmed}`);
      setPrompt("");
      await fetchDigitalAssignments();
      return;
    }

    if (isFacultySearchRequest) {
      setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
      setToast(`→ ${trimmed}`);
      setPrompt("");
      
      // Extract faculty name from query
      let facultyQuery = trimmed;
      
      // Remove common prefixes and suffixes
      facultyQuery = facultyQuery.replace(/^(who is|search for|find|look for|faculty|professor|teacher|instructor)\s*/gi, '');
      facultyQuery = facultyQuery.replace(/\s*(ma'am|sir|dr\.?|prof\.?|mr\.?|mrs\.?|ms\.?)$/gi, '');
      facultyQuery = facultyQuery.trim();
      
      // If query is too short after cleaning, use original
      if (facultyQuery.length < 3) {
        facultyQuery = trimmed;
      }
      
      console.log('Faculty search - Original query:', trimmed);
      console.log('Faculty search - Cleaned query:', facultyQuery);
      
      await fetchFacultySearch(facultyQuery);
      return;
    }

    if (isMessMenuRequest) {
      setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
      setToast(`→ ${trimmed}`);
      setPrompt("");
      // Reset messit session and reset state for fresh mess menu session
      await resetMessitSession();
      await fetchMessOptions();
      return;
    }
    
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setToast(`→ ${trimmed}`);
    setLoading(true);
    setPrompt("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt: trimmed }),
      });
      
      // Check if response is JSON
      const contentType = res.headers.get("content-type");
      let data;
      
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        // If not JSON, get text response
        const text = await res.text();
        console.error("Non-JSON response from /api/generate:", text);
        
        // Check if it's an authentication error
        if (text.includes('Unauthorized') || text.includes('401') || text.includes('sign-in')) {
          throw new Error("Authentication failed. Please refresh the page and try again.");
        }
        
        // Check if it's a server error
        if (text.includes('500') || text.includes('Internal Server Error')) {
          throw new Error("Server error. Please try again in a moment.");
        }
        
        throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}...`);
      }
      
      const content = data.text || data.error || "No response";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content,
          faculties: data.faculties || (data.faculty ? [data.faculty] : null),
          club: data.club || null,
          requiresVtopLogin: data.requiresVtopLogin || false,
        },
      ]);
    } catch (error) {
      const fallback = error instanceof Error ? error.message : "Something went wrong";
      setMessages((prev) => [...prev, { role: "assistant", content: fallback }]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await submitPrompt(prompt);
  }

  function handleQuickAction(fillValue) {
    setPrompt(fillValue);
    inputRef.current?.focus();
  }

  return (
    <>
      <div className="stars" aria-hidden="true" />
      <div className="stars stars--slow" aria-hidden="true" />
      <div className="shooting-stars" aria-hidden="true">
        <span />
      </div>

      {/* VTOP Login Component - appears in corner when signed in */}
      <SignedIn>
        <VtopLogin />
      </SignedIn>

      <div className={isSignedIn ? "wrap" : "wrap wrap--landing"}>
        <header>
          <div className="wordmark">VIT CHAT BOT</div>
          <SignedIn>
            <div className="auth-actions">
              <UserButton afterSignOutUrl="/" />
            </div>
          </SignedIn>
        </header>

        <main>
          <SignedOut>
            <section className="auth-landing" aria-label="Authentication required">
              <div className="auth-landing__background" aria-hidden="true">
                <span className="auth-landing__orb" />
                <span className="auth-landing__orb auth-landing__orb--blue" />
                <span className="auth-landing__ring" />
              </div>

              <div className="auth-landing__card">
                <div className="auth-landing__sparkles" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>

                <p className="auth-landing__eyebrow">Account Required</p>
                <h2 className="auth-landing__title">Step inside the VIT experience</h2>
                <p className="auth-landing__meta">
                  Sign in or create an account to unlock personalised schedules, faculty lookups, and curated campus
                  updates—all in one secure place.
                </p>

                <ul className="auth-landing__highlights">
                  <li>Sync attendance insights tailored to your timetable</li>
                  <li>Discover clubs and events picked for your interests</li>
                  <li>Chat with verified information drawn from VIT sources</li>
                </ul>

                <div className="auth-landing__cta">
                  <SignInButton mode="modal">
                    <button type="button" className="auth-landing__button">
                      Sign in
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button type="button" className="auth-landing__button auth-landing__button--ghost">
                      Register
                    </button>
                  </SignUpButton>
                </div>

                <p className="auth-landing__note">No spam—just smarter campus conversations.</p>
              </div>
            </section>
          </SignedOut>

          <SignedIn>
            <section className="hero" aria-label="Greeting">
              <h1>Hey VITian, ready to catch up?</h1>
              <p className="sub">{heroSubtitle}</p>

              <div className="chips" role="list">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    className="chip"
                    type="button"
                    data-fill={action.fill}
                    onClick={() => handleQuickAction(action.fill)}
                  >
                    {action.label}
                  </button>
                ))}
              </div>

              <div className="chat-thread" aria-live="polite">
                {messages.map((message, index) => {
                  const faculties = message.faculties || (message.faculty ? [message.faculty] : null);

                  return (
                    <article
                      key={`${message.role}-${index}`}
                      className={`bubble ${message.role}`}
                      aria-label={message.role === "user" ? "User message" : "Assistant message"}
                    >
                      <span className="bubble-label">
                        {message.role === "user" ? "You" : BOT_NAME}
                      </span>
                      {message.content && <p className="bubble-text">{message.content}</p>}

                      {faculties && faculties.length > 0 && (
                        <div className="profile-card-grid">
                          {faculties.map((faculty) => (
                            <div
                              className="profile-card profile-card--faculty"
                              key={`${faculty.name}-${faculty.school || "unknown"}`}
                            >
                              {faculty.photoUrl && (
                                <div className="profile-card__media">
                                  <img
                                    src={faculty.photoUrl}
                                    alt={`Photo of ${faculty.name}`}
                                    loading="lazy"
                                  />
                                </div>
                              )}
                              <div className="profile-card__body">
                                <h3>{faculty.name}</h3>
                                <p className="profile-card__meta">
                                  {faculty.position}
                                  {faculty.school ? ` · ${faculty.school}` : ""}
                                </p>
                                {faculty.subject && (
                                  <p className="profile-card__subtitle">Focus: {faculty.subject}</p>
                                )}
                                {faculty.readMoreUrl && (
                                  <a
                                    className="profile-card__link"
                                    href={faculty.readMoreUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    View full profile ↗
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {message.club && (
                        <div className="profile-card profile-card--club">
                          {message.club.imageUrl && (
                            <div className="profile-card__media">
                              <img
                                src={message.club.imageUrl}
                                alt={`Logo for ${message.club.name}`}
                                loading="lazy"
                              />
                            </div>
                          )}
                          <div className="profile-card__body">
                            <h3>{message.club.name}</h3>
                            <p className="profile-card__meta">{message.club.category}</p>
                            {message.club.description && (
                              <p className="profile-card__subtitle">{message.club.description}</p>
                            )}
                            {message.club.contactEmail && (
                              <p className="profile-card__subtitle">Contact: {message.club.contactEmail}</p>
                            )}
                            {message.club.sourceUrl && (
                              <a
                                className="profile-card__link"
                                href={message.club.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Visit club page ↗
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      {message.showSemesterDropdown && message.semesters && message.semesters.length > 1 && (
                        <div className="assignments-semester-selector">
                          <div className="semester-selector-header">
                            <h4>📚 Select Semester</h4>
                            <p>Choose a different semester to view assignments</p>
                          </div>
                          <div className="semester-dropdown-container">
                            <select
                              value={message.semester?.value || ''}
                              onChange={async (e) => {
                                const semester = message.semesters.find(s => s.value === e.target.value);
                                if (semester) {
                                  await fetchDigitalAssignments(semester.label);
                                }
                              }}
                              disabled={assignmentsLoading}
                              className="semester-dropdown"
                            >
                              {message.semesters.map((semester) => (
                                <option key={semester.value} value={semester.value}>
                                  {semester.label}
                                </option>
                              ))}
                            </select>
                            {assignmentsLoading && (
                              <div className="loading-indicator">
                                <span className="loading-spinner"></span>
                                Loading assignments...
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {message.assignments && message.assignments.length > 0 && (
                        <div className="assignments-course-selector">
                          <div className="course-selector-header">
                            <h4>📖 Select Course</h4>
                            <p>Choose a course to view detailed assignments with due dates</p>
                          </div>
                          <div className="course-dropdown-container">
                            <select
                              value={selectedCourse?.dashboardRef || ''}
                              onChange={async (e) => {
                                const classId = e.target.value;
                                console.log('Course dropdown changed:', classId);
                                console.log('Available assignments:', message.assignments);
                                
                                if (classId) {
                                  const course = message.assignments.find(a => a.dashboardRef === classId);
                                  console.log('Found course:', course);
                                  if (course) {
                                    setSelectedCourse(course);
                                    await fetchCourseDetails(classId);
                                  }
                                } else {
                                  setSelectedCourse(null);
                                  setCourseDetails(null);
                                }
                              }}
                              disabled={courseDetailsLoading}
                              className="course-dropdown"
                            >
                              <option value="">Select a course...</option>
                              {message.assignments.map((assignment) => (
                                <option key={assignment.dashboardRef} value={assignment.dashboardRef}>
                                  {assignment.courseCode} - {assignment.courseTitle} ({assignment.courseType})
                                </option>
                              ))}
                            </select>
                            {courseDetailsLoading && (
                              <div className="loading-indicator">
                                <span className="loading-spinner"></span>
                                Loading course details...
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {message.facultyResults && message.facultyResults.length > 0 && (
                        <div className="faculty-search-selector">
                          <div className="faculty-selector-header">
                            <h4>👨‍🏫 Select Faculty</h4>
                            <p>Choose a faculty member to view detailed information</p>
                          </div>
                          <div className="faculty-dropdown-container">
                            <select
                              value={selectedFaculty?.employeeId || ''}
                              onChange={async (e) => {
                                const employeeId = e.target.value;
                                console.log('Faculty dropdown changed:', employeeId);
                                console.log('Available faculty:', message.facultyResults);
                                
                                if (employeeId) {
                                  const faculty = message.facultyResults.find(f => f.employeeId === employeeId);
                                  console.log('Found faculty:', faculty);
                                  if (faculty) {
                                    setSelectedFaculty(faculty);
                                    await fetchFacultyDetails(employeeId);
                                  }
                                } else {
                                  setSelectedFaculty(null);
                                  setFacultyDetails(null);
                                }
                              }}
                              disabled={facultyDetailsLoading}
                              className="faculty-dropdown"
                            >
                              <option value="">Select a faculty member...</option>
                              {message.facultyResults.map((faculty) => (
                                <option key={faculty.employeeId} value={faculty.employeeId}>
                                  {faculty.name} - {faculty.designation} ({faculty.school})
                                </option>
                              ))}
                            </select>
                            {facultyDetailsLoading && (
                              <div className="loading-indicator">
                                <span className="loading-spinner"></span>
                                Loading faculty details...
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {message.showMessOptions && message.messOptions && (
                        <div className="mess-options-selector">
                          <div className="mess-options-header">
                            <h4>🍽️ Select Mess Options</h4>
                            <p>Choose your hostel type and mess type to view the menu</p>
                          </div>
                          <div className="mess-dropdowns-container">
                            <div className="mess-dropdown-group">
                              <label>Hostel Type:</label>
                              <select
                                value={selectedHostelType?.value || ''}
                                onChange={(e) => {
                                  const hostelValue = e.target.value;
                                  if (hostelValue) {
                                    const hostel = message.messOptions.hostelTypes.find(h => h.value === hostelValue);
                                    if (hostel) {
                                      setSelectedHostelType(hostel);
                                    }
                                  } else {
                                    setSelectedHostelType(null);
                                  }
                                }}
                                disabled={messOptionsLoading}
                                className="mess-dropdown"
                              >
                                <option value="">Select hostel type...</option>
                                {message.messOptions.hostelTypes.map((hostel) => (
                                  <option key={hostel.value} value={hostel.value}>
                                    {hostel.label || hostel.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            
                            <div className="mess-dropdown-group">
                              <label>Mess Type:</label>
                              <select
                                value={selectedMessType?.value || ''}
                                onChange={(e) => {
                                  const messValue = e.target.value;
                                  if (messValue) {
                                    const mess = message.messOptions.messTypes.find(m => m.value === messValue);
                                    if (mess) {
                                      setSelectedMessType(mess);
                                    }
                                  } else {
                                    setSelectedMessType(null);
                                  }
                                }}
                                disabled={messOptionsLoading}
                                className="mess-dropdown"
                              >
                                <option value="">Select mess type...</option>
                                {message.messOptions.messTypes.map((mess) => (
                                  <option key={mess.value} value={mess.value}>
                                    {mess.label || mess.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            
                            <button
                              className="mess-submit-btn"
                              onClick={async () => {
                                if (selectedHostelType && selectedMessType) {
                                  await fetchMessMenu(selectedHostelType.value, selectedMessType.value);
                                }
                              }}
                              disabled={!selectedHostelType || !selectedMessType || messMenuLoading}
                            >
                              {messMenuLoading ? "Loading Menu..." : "View Menu"}
                            </button>
                            
                            {messOptionsLoading && (
                              <div className="loading-indicator">
                                <span className="loading-spinner"></span>
                                Loading options...
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {message.showMessMenu && message.messMenu && message.messMenu.availableDates && (
                        <div className="mess-menu-selector">
                          <div className="mess-menu-header">
                            <h4>📅 Select Date</h4>
                            <p>Choose a date to view the menu for that day</p>
                          </div>
                          <div className="mess-date-container">
                            <select
                              value={selectedDate || ''}
                              onChange={async (e) => {
                                const date = e.target.value;
                                if (date && selectedHostelType && selectedMessType) {
                                  setSelectedDate(parseInt(date));
                                  await fetchMessMenu(selectedHostelType.value, selectedMessType.value, date);
                                }
                              }}
                              disabled={messMenuLoading}
                              className="mess-date-dropdown"
                            >
                              <option value="">Select date...</option>
                              {message.messMenu.availableDates.map((date) => (
                                <option key={`day-${date.dayNumber}`} value={`${date.dayNumber}`}>
                                  {date.isToday ? '✅ ' : '📅 '}Day {date.dayNumber}{date.isToday ? ' (Today)' : ''}
                                </option>
                              ))}
                            </select>
                            
                            {messMenuLoading && (
                              <div className="loading-indicator">
                                <span className="loading-spinner"></span>
                                Loading menu...
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {message.messMenu && message.messMenu.menuItems && message.messMenu.menuItems.length > 0 && (
                        <div className="mess-menu-display">
                          <div className="mess-menu-title">
                            {message.messMenu.hostelType} - {message.messMenu.messType}
                          </div>
                          <div className="mess-menu-subtitle">
                            {message.messMenu.dayName}, {message.messMenu.date} • Day {message.messMenu.selectedDate}
                            {message.messMenu.isRealTime && (
                              <span style={{ marginLeft: '8px', fontSize: '0.85em', opacity: 0.8 }}>
                                (Real-time data)
                              </span>
                            )}
                          </div>
                          
                          {message.messMenu.menuItems.map((meal, index) => (
                            <div key={index} className="mess-meal-section" data-meal={meal.meal.toLowerCase()}>
                              <div className="mess-meal-title">
                                {meal.meal}
                              </div>
                              <div className="mess-meal-items">
                                {meal.items.map((item, itemIndex) => (
                                  <div key={itemIndex} className="mess-meal-item">
                                    {item}
                                  </div>
                                ))}
                              </div>
                              <div className="mess-meal-time">
                                {meal.time || 'Time not specified'}
                              </div>
                            </div>
                          ))}
                          
                          <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(83, 192, 211, 0.1)', borderRadius: '12px', border: '1px solid rgba(83, 192, 211, 0.3)' }}>
                            <div style={{ color: '#53C0D3', fontWeight: '600', marginBottom: '8px' }}>ℹ️ Menu Information</div>
                            <div style={{ fontSize: '0.9em', color: 'var(--muted)', lineHeight: '1.4' }}>
                              • Real-time data from messit.vinnovateit.com<br/>
                              • Use the date selector above to view different dates<br/>
                              • Menu items may vary based on availability
                            </div>
                          </div>
                        </div>
                      )}

                    </article>
                  );
                })}

                {loading && (
                  <article className="bubble assistant typing" aria-label="Assistant is typing">
                    <span className="bubble-label">{BOT_NAME}</span>
                    <div className="typing-dots" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </div>
                  </article>
                )}

                {!messages.length && !loading && (
                  <div className="chat-placeholder">
                    <strong>Start the chat</strong>
                    <span>
                      Ask about your schedule, attendance, cafeteria menus, or anything else on campus.
                    </span>
                  </div>
                )}
              </div>
            </section>
          </SignedIn>
        </main>

        <footer />
      </div>

      <SignedIn>
        <form className="dock" role="search" onSubmit={handleSubmit}>
          <div className="kbd" title="Command">
            &#8984;
          </div>
          <input
            ref={inputRef}
            id="prompt"
            className="input"
            placeholder="Talk to me..."
            aria-label="Chat input"
            value={prompt}
            disabled={loading}
            onChange={(event) => setPrompt(event.target.value)}
          />
          <button
            className="btn"
            id="mic"
            type="button"
            title="Voice input (upcoming)"
            onClick={() => setToast("Voice input coming soon")}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M12 14a3 3 0 0 0 3-3V7a3 3 0 1 0-6 0v4a3 3 0 0 0 3 3Zm7-3a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V20H8a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2h-3v-2.08A7 7 0 0 0 19 11Z"
                fill="currentColor"
              />
            </svg>
          </button>
          <button className="btn send" id="send" type="submit" title="Send" disabled={loading}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path d="M3.4 20.6 21 12 3.4 3.4 5 11l10 1-10 1-1.6 7.6Z" fill="currentColor" />
            </svg>
          </button>
        </form>
      </SignedIn>

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </>
  );
}

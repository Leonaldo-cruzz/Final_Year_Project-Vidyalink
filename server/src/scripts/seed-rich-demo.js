import mongoose from 'mongoose';
import crypto from 'crypto';
import User from '../models/user.model.js';
import StudentProfile from '../models/studentProfile.model.js';
import Project from '../models/project.model.js';
import Workspace from '../models/workspace.model.js';
import Milestone from '../models/milestone.model.js';
import Portfolio from '../models/portfolio.model.js';
import Application from '../models/application.model.js';
import { env } from '../config/env.js';

// ─────────────────────────────────────────────────────────────────────────────
// DEVELOPMENT / STAGING ONLY — NEVER RUN IN PRODUCTION
// This script creates synthetic demo accounts for local development and
// manual QA sessions.  It is NOT called anywhere in the application startup
// path and MUST NOT be added to any production CI/CD pipeline.
// ─────────────────────────────────────────────────────────────────────────────
if (env.NODE_ENV === 'production') {
  console.error('\n❌  BLOCKED: seed-rich-demo.js MUST NOT be run in production.\n');
  process.exit(1);
}

const DEMO_USERS = [
  {
    fullName: 'Alex Student',
    email: 'student@vidyalink.edu',
    password: 'Password123!',
    role: 'student',
    college: 'Vidya Institute of Technology (Demo)',
    branch: 'Computer Science & Engineering',
    graduationYear: 2026,
    isEmailVerified: true,
  },
  {
    fullName: 'Dr. Sarah Jenkins',
    email: 'faculty@vidyalink.edu',
    password: 'Password123!',
    role: 'faculty',
    college: 'Vidya Institute of Technology (Demo)',
    branch: 'Computer Science & Engineering',
    isEmailVerified: true,
  },
  {
    fullName: 'Marcus Vance',
    email: 'recruiter@vidyalink.edu',
    password: 'Password123!',
    role: 'recruiter',
    college: 'Apex DeepTech Labs (Demo)',
    isEmailVerified: true,
  },
  {
    fullName: 'Elena Rostova',
    email: 'alumni@vidyalink.edu',
    password: 'Password123!',
    role: 'alumni',
    college: 'Vidya Institute of Technology (Alumna Demo)',
    branch: 'Software Engineering',
    graduationYear: 2022,
    isEmailVerified: true,
  },
  {
    fullName: 'System Admin',
    email: 'admin@vidyalink.edu',
    password: 'Password123!',
    role: 'admin',
    college: 'VidyaLink University Network (Demo)',
    isEmailVerified: true,
  },
  // Synthetic candidates for recruiter talent pool
  {
    fullName: 'Priya Sharma',
    email: 'priya.demo@institute.edu',
    password: 'Password123!',
    role: 'student',
    college: 'National Computing Institute (Demo)',
    branch: 'Computer Science & Engineering',
    graduationYear: 2026,
    isEmailVerified: true,
  },
  {
    fullName: 'Rahul Mehta',
    email: 'rahul.demo@institute.edu',
    password: 'Password123!',
    role: 'student',
    college: 'Regional Tech University (Demo)',
    branch: 'Data Science & AI',
    graduationYear: 2025,
    isEmailVerified: true,
  },
  {
    fullName: 'Ananya Joshi',
    email: 'ananya.demo@institute.edu',
    password: 'Password123!',
    role: 'student',
    college: 'Metro Engineering College (Demo)',
    branch: 'Electronics & Computer Systems',
    graduationYear: 2026,
    isEmailVerified: true,
  },
  {
    fullName: 'Karan Verma',
    email: 'karan.demo@institute.edu',
    password: 'Password123!',
    role: 'student',
    college: 'City Institute of Technology (Demo)',
    branch: 'Information Technology',
    graduationYear: 2025,
    isEmailVerified: true,
  },
];

async function seedRichDemo() {
  try {
    const mongoUri = env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vidyalink';
    console.log(`Connecting to MongoDB at ${mongoUri}...`);
    await mongoose.connect(mongoUri);

    console.log('Seeding demo accounts with fictional institutional identities...');
    const usersMap = {};

    for (const userData of DEMO_USERS) {
      let user = await User.findOne({ email: userData.email });
      if (user) {
        user.password = userData.password;
        user.fullName = userData.fullName;
        user.role = userData.role;
        user.college = userData.college;
        user.branch = userData.branch;
        user.graduationYear = userData.graduationYear;
        user.isEmailVerified = true;
        await user.save();
      } else {
        user = await User.create(userData);
      }
      usersMap[userData.email] = user;
    }

    const studentUser = usersMap['student@vidyalink.edu'];
    const facultyUser = usersMap['faculty@vidyalink.edu'];
    const recruiterUser = usersMap['recruiter@vidyalink.edu'];

    // 1. Student Profile for Alex Student
    await StudentProfile.findOneAndUpdate(
      { user: studentUser._id },
      {
        user: studentUser._id,
        bio: 'Systems & ML engineering student passionate about high-throughput distributed inference pipelines and verifiable academic project evidence.',
        college: 'Vidya Institute of Technology (Demo)',
        department: 'School of Engineering',
        branch: 'Computer Science & Engineering',
        graduationYear: 2026,
        cgpa: 3.92,
        githubUsername: 'alexstudent-demo',
        skills: ['Distributed Systems', 'PyTorch', 'TypeScript', 'Node.js', 'Kubernetes', 'gRPC', 'Go'],
        education: [
          {
            institution: 'Vidya Institute of Technology (Demo)',
            degree: 'Bachelor of Technology',
            fieldOfStudy: 'Computer Science & Engineering',
            startYear: 2022,
            endYear: 2026,
            description: 'Major GPA: 3.92/4.00. Dean’s Honors List (2022–2026). Specialization in Distributed Cloud Systems.',
          },
        ],
        certifications: [
          {
            name: 'Cloud Native Developer Certification (Demo)',
            issuingOrganization: 'Cloud Native Computing Foundation (Demo)',
            issueDate: new Date('2025-05-15'),
            credentialId: 'CND-8849201',
          },
        ],
      },
      { upsert: true, new: true }
    );
    console.log('Upserted student profile for Alex Student');

    // 2. Projects (Faculty-verified project + Recruiter hiring project)
    let facultyProject = await Project.findOne({ title: 'Distributed ML Model Serving Pipeline' });
    if (!facultyProject) {
      facultyProject = await Project.create({
        userId: facultyUser._id,
        title: 'Distributed ML Model Serving Pipeline',
        shortDescription: 'High-throughput microsecond latency inference mesh with dynamic model sharding and gRPC streaming.',
        detailedDescription: 'Students develop an inference orchestrator supporting dynamic tensor batching, multi-GPU memory pooling, and fault-tolerant replica balancing. Validated through continuous faculty review and benchmarking.',
        category: 'AI / ML',
        domain: 'Cloud Systems & AI Infrastructure',
        technologies: ['PyTorch', 'gRPC', 'Docker', 'Kubernetes', 'Go', 'Prometheus'],
        githubRepository: 'https://github.com/example/distributed-ml-serving',
        projectStatus: 'Completed',
        verificationStatus: 'Verified',
        featured: true,
      });
      console.log('Created faculty project');
    }

    let recruiterProject = await Project.findOne({ title: 'Autonomous Vision & Edge Telemetry (Demo)' });
    if (!recruiterProject) {
      recruiterProject = await Project.create({
        userId: recruiterUser._id,
        title: 'Autonomous Vision & Edge Telemetry (Demo)',
        shortDescription: 'Edge computing pipeline deploying lightweight vision models on edge devices with MQTT event streams.',
        detailedDescription: 'Industry project under Apex DeepTech Labs (Demo) evaluating candidate capabilities in embedded systems, computer vision model quantization (INT8), and telemetry synchronization.',
        category: 'IoT',
        domain: 'Edge Computing & Autonomous Robotics',
        technologies: ['Python', 'OpenCV', 'TensorRT', 'MQTT', 'C++', 'WebSockets'],
        githubRepository: 'https://github.com/example/edge-vision-pipeline',
        projectStatus: 'In Progress',
        verificationStatus: 'Verified',
        featured: true,
      });
      console.log('Created recruiter industry project');
    }

    // 3. Application linking Alex to facultyProject
    let studentApp = await Application.findOne({
      projectOpportunityId: facultyProject._id,
      studentId: studentUser._id,
    });
    if (!studentApp) {
      studentApp = await Application.create({
        projectOpportunityId: facultyProject._id,
        project: facultyProject._id,
        studentId: studentUser._id,
        student: studentUser._id,
        coverLetter: 'I have hands-on experience building distributed systems with Go and PyTorch, optimizing memory allocations for inference workloads.',
        skills: ['Distributed Systems', 'PyTorch', 'gRPC', 'Docker'],
        status: 'Selected',
        selectedAt: new Date('2025-09-01'),
      });
    }

    // 4. Live Workspace for Alex Student (internal record)
    let workspace = await Workspace.findOne({
      project: facultyProject._id,
      student: studentUser._id,
    });
    if (!workspace) {
      workspace = await Workspace.create({
        project: facultyProject._id,
        student: studentUser._id,
        owner: facultyUser._id,
        application: studentApp._id,
        status: 'completed',
        progressPercentage: 100,
        startedAt: new Date('2025-09-10'),
        completedAt: new Date('2025-12-15'),
      });
    } else {
      workspace.status = 'completed';
      workspace.progressPercentage = 100;
      await workspace.save();
    }

    // 5. Verified Project Evidence (Milestones)
    await Milestone.deleteMany({ workspace: workspace._id });
    const m1 = await Milestone.create({
      workspace: workspace._id,
      title: 'Evidence 1: Architectural Design & gRPC Protocol Specification',
      description: 'Defined protobuf message specs, service contracts, and latency targets for the coordinator.',
      dueDate: new Date('2025-10-01'),
      order: 1,
      status: 'verified',
      deliverableUrl: 'https://github.com/example/distributed-ml-serving/pull/1',
      deliverableNotes: 'Architecture design document and protocol definitions committed and reviewed.',
      submittedAt: new Date('2025-09-28'),
      feedback: 'Excellent design. Clean separation of model control plane from data tensors.',
      verifiedAt: new Date('2025-09-30'),
    });

    const m2 = await Milestone.create({
      workspace: workspace._id,
      title: 'Evidence 2: Dynamic Tensor Batching & CUDA Memory Engine',
      description: 'Implemented thread-safe worker queues with Adaptive Batch Sizing reaching 94% GPU saturation.',
      dueDate: new Date('2025-11-01'),
      order: 2,
      status: 'verified',
      deliverableUrl: 'https://github.com/example/distributed-ml-serving/pull/8',
      deliverableNotes: 'Engine benchmarks and stress tests under concurrent load.',
      submittedAt: new Date('2025-10-29'),
      feedback: 'Throughput matches expected benchmarks. Low p99 latency confirmed.',
      verifiedAt: new Date('2025-10-31'),
    });

    const m3 = await Milestone.create({
      workspace: workspace._id,
      title: 'Evidence 3: Deployment Operator & Telemetry Integration',
      description: 'Packaged deployment with auto-scaling based on queue latency telemetry.',
      dueDate: new Date('2025-12-10'),
      order: 3,
      status: 'verified',
      deliverableUrl: 'https://github.com/example/distributed-ml-serving/pull/14',
      deliverableNotes: 'Deployment manifests and integration test suite completed.',
      submittedAt: new Date('2025-12-08'),
      feedback: 'Outstanding project deliverable. Formally certified with faculty endorsement.',
      verifiedAt: new Date('2025-12-12'),
    });

    // 6. Faculty-Verified Portfolio Record
    await Portfolio.deleteMany({ student: studentUser._id });
    const certHash = '0x' + crypto.createHash('sha256').update(`${studentUser._id}-${workspace._id}-vidyalink-record`).digest('hex');
    const portfolio = await Portfolio.create({
      certificateId: 'VLC-2026-A89F',
      student: studentUser._id,
      workspace: workspace._id,
      projectTitle: 'Distributed ML Model Serving Pipeline',
      verifiedBy: facultyUser._id,
      skillsVerified: [
        'Distributed Systems Architecture',
        'PyTorch Inference Optimization',
        'gRPC Microservices',
        'High-Throughput Concurrency',
        'Deployment Operator Development',
      ],
      milestonesSummary: [
        { title: m1.title, completedAt: m1.verifiedAt },
        { title: m2.title, completedAt: m2.verifiedAt },
        { title: m3.title, completedAt: m3.verifiedAt },
      ],
      verificationHash: certHash,
      issuedAt: new Date('2025-12-15'),
    });
    console.log(`Created verified portfolio: ${portfolio.certificateId}`);

    // 7. Synthetic candidate applications for Recruiter Marcus Vance
    const candidatePool = [
      {
        user: usersMap['priya.demo@institute.edu'],
        status: 'Shortlisted',
        pitch: 'Built an edge perception model for autonomous rover with 45 FPS on edge hardware. Proficient in OpenCV and INT8 quantization.',
        skills: ['Computer Vision', 'PyTorch', 'TensorRT', 'C++', 'ROS2'],
        github: 'https://github.com/example/edge-perception',
        resume: 'https://example.com/dossiers/priya_sharma_resume.pdf',
      },
      {
        user: usersMap['rahul.demo@institute.edu'],
        status: 'Interview Scheduled',
        pitch: 'Specialized in real-time sensor fusion with MQTT brokering and Kafka ingestion. Published student paper on edge telemetry.',
        skills: ['MQTT', 'Python', 'Kafka', 'Time-Series Data', 'Docker'],
        github: 'https://github.com/example/telemetry-mesh',
        resume: 'https://example.com/dossiers/rahul_mehta_resume.pdf',
        interviewDate: new Date(Date.now() + 86400000 * 2),
        interviewMode: 'Online',
      },
      {
        user: usersMap['ananya.demo@institute.edu'],
        status: 'Under Review',
        pitch: 'Experienced in embedded firmware and communication protocols. Designed hardware acceleration pipeline on FPGA.',
        skills: ['Embedded Systems', 'C++', 'FreeRTOS', 'I2C/SPI', 'VHDL'],
        github: 'https://github.com/example/fpga-vision-core',
        resume: 'https://example.com/dossiers/ananya_joshi_resume.pdf',
      },
      {
        user: usersMap['karan.demo@institute.edu'],
        status: 'Applied',
        pitch: 'Cloud telemetry engineer with expertise in WebSockets, Grafana observability dashboards, and low-latency API architectures.',
        skills: ['Go', 'WebSockets', 'Prometheus', 'Grafana', 'Kubernetes'],
        github: 'https://github.com/example/edge-telemetry-dashboard',
        resume: 'https://example.com/dossiers/karan_verma_resume.pdf',
      },
      {
        user: studentUser,
        status: 'Selected',
        pitch: 'Proven record building verified distributed ML pipelines with faculty sign-off. Ready to lead edge inference optimization modules.',
        skills: ['Distributed Systems', 'PyTorch', 'Kubernetes', 'gRPC'],
        github: 'https://github.com/example/distributed-ml-serving',
        resume: 'https://example.com/dossiers/alex_student_resume.pdf',
      },
    ];

    for (const cand of candidatePool) {
      await Application.findOneAndUpdate(
        {
          projectOpportunityId: recruiterProject._id,
          studentId: cand.user._id,
        },
        {
          projectOpportunityId: recruiterProject._id,
          project: recruiterProject._id,
          studentId: cand.user._id,
          student: cand.user._id,
          recruiterId: recruiterUser._id,
          coverLetter: cand.pitch,
          pitch: cand.pitch,
          skills: cand.skills,
          status: cand.status,
          githubSnapshot: cand.github,
          githubUrl: cand.github,
          resumeSnapshot: cand.resume,
          resumeUrl: cand.resume,
          interviewDate: cand.interviewDate || null,
          interviewMode: cand.interviewMode || null,
          selectedAt: cand.status === 'Selected' ? new Date() : null,
        },
        { upsert: true, new: true }
      );
    }
    console.log(`Seeded ${candidatePool.length} demo applicant records for recruiter review`);

    console.log('\n=============================================');
    console.log('Demo Data successfully seeded with Fictional Institutional Identities!');
    console.log('Demo Login Credentials (all passwords: Password123!):');
    console.log('- Student:   student@vidyalink.edu');
    console.log('- Faculty:   faculty@vidyalink.edu');
    console.log('- Recruiter: recruiter@vidyalink.edu');
    console.log('- Alumni:    alumni@vidyalink.edu');
    console.log('- Admin:     admin@vidyalink.edu');
    console.log('=============================================\n');

    process.exit(0);
  } catch (err) {
    console.error('Error seeding demo data:', err);
    process.exit(1);
  }
}

seedRichDemo();

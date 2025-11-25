# Requirements Document

## Introduction

This document specifies the requirements for a Customer Relationship Management (CRM) system designed for an education consultancy based in Hyderabad, India. The CRM System consists of a web application for admins and an Android mobile application for telecallers. The system facilitates lead management and follow-up activities for local Indian universities, supporting multi-branch operations and scaling to accommodate 300+ telecallers. Telecallers handle the complete student engagement lifecycle: making outbound calls, capturing lead information, conducting follow-ups, and managing the enrollment process. Admins provide student data via CSV imports which telecallers then work with independently.

## Glossary

- **CRM System**: The Customer Relationship Management application consisting of a web admin portal and Android mobile app
- **Admin Portal**: The web-based interface used by admins for system configuration and data import
- **Mobile App**: The Android application used by telecallers for lead management and calling
- **Telecaller**: A staff member who makes outbound calls, captures leads, and conducts follow-ups
- **Lead**: A prospective student record containing contact information and engagement status
- **Branch**: A physical office location of the consultancy
- **Admin**: A user with elevated privileges to manage system configuration and user accounts
- **Unassigned Lead Pool**: A collection of imported student records not yet claimed by any telecaller
- **CSV Import**: The process of uploading student data from a comma-separated values file
- **Follow-up**: A scheduled or completed interaction with a lead
- **Assignment**: The allocation of leads to specific telecallers

## Requirements

### Requirement 1

**User Story:** As an admin, I want to manage multiple branch locations, so that each office can operate independently within the same system

#### Acceptance Criteria

1. THE CRM System SHALL provide functionality to create branch records with name and location details
2. THE CRM System SHALL provide functionality to edit existing branch information
3. THE CRM System SHALL provide functionality to deactivate branches without deleting historical data
4. THE CRM System SHALL associate each telecaller account with exactly one branch
5. THE CRM System SHALL filter lead visibility based on the branch assignment of the logged-in user

### Requirement 2

**User Story:** As an admin, I want to create and manage telecaller accounts, so that staff can access the system with appropriate permissions

#### Acceptance Criteria

1. THE CRM System SHALL provide functionality to create telecaller user accounts with username and password
2. THE CRM System SHALL assign each telecaller to a specific branch during account creation
3. THE CRM System SHALL provide functionality to deactivate telecaller accounts
4. THE CRM System SHALL authenticate users before granting system access
5. THE CRM System SHALL restrict telecallers to view and manage only leads assigned to them

### Requirement 3

**User Story:** As an admin, I want to import student data via CSV files and auto-assign them evenly, so that telecallers receive balanced workloads

#### Acceptance Criteria

1. THE CRM System SHALL accept CSV file uploads containing student name and phone number fields only
2. WHEN a CSV file is uploaded, THE CRM System SHALL validate each row for required fields (name and phone)
3. WHEN validation succeeds, THE CRM System SHALL create lead records from the CSV data
4. WHEN leads are created from CSV import, THE CRM System SHALL distribute them evenly across active telecallers in the selected branch using round-robin allocation
5. IF a CSV row contains invalid data, THEN THE CRM System SHALL log the error and continue processing remaining rows
6. THE CRM System SHALL display a summary report showing successful imports, validation errors, and assignment distribution per telecaller

### Requirement 4

**User Story:** As an admin, I want to select which telecallers receive imported leads, so that I can control workload distribution

#### Acceptance Criteria

1. WHEN uploading a CSV file, THE CRM System SHALL provide functionality to select target telecallers from the branch
2. THE CRM System SHALL display active telecallers with their current lead count for selection
3. WHEN telecallers are selected, THE CRM System SHALL distribute imported leads evenly among selected telecallers only
4. THE CRM System SHALL calculate distribution using total imported leads divided by number of selected telecallers
5. THE CRM System SHALL assign any remainder leads sequentially to the first telecallers in the selection

### Requirement 5

**User Story:** As a telecaller, I want to view my assigned leads, so that I know which students to contact

#### Acceptance Criteria

1. WHEN a telecaller logs in, THE CRM System SHALL display a list of leads assigned to that telecaller
2. THE CRM System SHALL display student name, phone number, and current status for each lead
3. THE CRM System SHALL provide filtering options by lead status
4. THE CRM System SHALL provide search functionality by student name or phone number
5. THE CRM System SHALL sort leads with pending follow-ups at the top of the list

### Requirement 6

**User Story:** As a telecaller, I want to make calls and capture comprehensive lead information, so that I can record student interest and complete details

#### Acceptance Criteria

1. THE Mobile App SHALL provide functionality to log outbound calls with timestamp
2. THE Mobile App SHALL provide functionality to update lead status with values: New, Contacted, Interested, Not Interested, Enrolled, Lost
3. THE Mobile App SHALL provide functionality to add and edit lead fields: email, alternate phone, city, preferred course, preferred university
4. THE Mobile App SHALL provide functionality to add notes to a lead record during or after calls
5. WHEN a telecaller updates a lead, THE Mobile App SHALL record the update timestamp
6. THE Mobile App SHALL display the complete interaction history for each lead

### Requirement 7

**User Story:** As a telecaller, I want to schedule follow-up activities, so that I can maintain regular contact with interested students

#### Acceptance Criteria

1. THE CRM System SHALL provide functionality to create follow-up tasks with date, time, and description
2. THE CRM System SHALL associate each follow-up task with a specific lead
3. WHEN a follow-up date arrives, THE CRM System SHALL display the lead in a priority follow-up list
4. THE CRM System SHALL provide functionality to mark follow-up tasks as completed
5. THE CRM System SHALL send notifications to telecallers for follow-ups scheduled within the next 24 hours

### Requirement 8

**User Story:** As a telecaller, I want to record call outcomes, so that my manager can track my productivity

#### Acceptance Criteria

1. THE CRM System SHALL provide functionality to log call attempts with outcome: Connected, No Answer, Busy, Invalid Number
2. WHEN a call is logged, THE CRM System SHALL record the call timestamp and duration
3. THE CRM System SHALL increment a call attempt counter for each lead
4. THE CRM System SHALL display total calls made by each telecaller in a daily summary
5. THE CRM System SHALL calculate conversion metrics from call attempts to enrolled students

### Requirement 9

**User Story:** As an admin, I want to view performance reports, so that I can monitor overall system activity and telecaller productivity

#### Acceptance Criteria

1. THE CRM System SHALL generate reports showing calls made per telecaller by date range
2. THE CRM System SHALL generate reports showing lead conversion rates per telecaller
3. THE CRM System SHALL provide filtering options by date range, branch, and telecaller
4. THE CRM System SHALL display total leads claimed, contacted, and enrolled per telecaller
5. THE CRM System SHALL export reports in CSV format

### Requirement 10

**User Story:** As an admin, I want the system to handle 300+ concurrent telecallers, so that the consultancy can scale operations

#### Acceptance Criteria

1. THE CRM System SHALL support 300 concurrent user sessions without performance degradation
2. THE CRM System SHALL respond to lead list queries within 2 seconds under full load
3. THE CRM System SHALL process CSV imports of 10,000 records within 5 minutes
4. THE CRM System SHALL maintain database connection pooling to handle concurrent requests
5. THE CRM System SHALL implement caching mechanisms for frequently accessed data

### Requirement 11

**User Story:** As a telecaller, I want a simple mobile interface without document uploads, so that I can focus on calling and follow-ups

#### Acceptance Criteria

1. THE Mobile App SHALL provide a streamlined interface with lead list, lead details, and follow-up sections
2. THE Mobile App SHALL NOT include document upload functionality
3. THE Mobile App SHALL display action buttons for common tasks: Call, Add Note, Schedule Follow-up, Update Status
4. THE Mobile App SHALL be optimized for Android devices running version 8.0 and above
5. THE Mobile App SHALL load the telecaller dashboard within 3 seconds of login

### Requirement 12

**User Story:** As a telecaller, I want to initiate calls directly from the mobile app, so that I can quickly contact students without manual dialing

#### Acceptance Criteria

1. WHEN a telecaller taps a phone number in a lead record, THE Mobile App SHALL initiate an outbound call using the device's telephony system
2. WHEN a call is initiated, THE Mobile App SHALL automatically log the call attempt with timestamp
3. THE Mobile App SHALL display the phone number as a tappable button in lead list and detail views
4. THE Mobile App SHALL request phone call permissions during initial setup
5. THE Mobile App SHALL support Indian mobile number formats with country code

### Requirement 13

**User Story:** As a telecaller, I want the app to automatically record my calls, so that I have a record of conversations for dispute resolution

#### Acceptance Criteria

1. WHEN a call is initiated through the Mobile App, THE Mobile App SHALL automatically start recording the call audio
2. WHEN a call ends, THE Mobile App SHALL save the recording file and associate it with the lead record
3. THE Mobile App SHALL upload call recordings to the server for storage and playback
4. THE Mobile App SHALL display a recording indicator during active calls
5. THE Mobile App SHALL request audio recording permissions during initial setup
6. THE Mobile App SHALL provide playback functionality for recorded calls in the lead history
7. WHEN a recording is played, THE Mobile App SHALL display call duration and timestamp



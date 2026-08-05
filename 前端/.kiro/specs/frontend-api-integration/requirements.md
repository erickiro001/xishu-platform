# Requirements Document

## Introduction

This feature replaces the static and mock data currently embedded in the 犀数工场 (Xishu Factory) mobile-style frontend with live data served by the backend REST API. The frontend is a React 19 + TypeScript + Vite single-page application using react-router v7, Tailwind CSS v3, and shadcn UI components. It presents listing and detail views for solutions (企业/解决方案), demands (需求), and news articles (动态), and provides forms for submitting demands, submitting solution applications, and expressing interest in a demand. It also supports authenticated access using a default administrator account.

The backend exposes an OpenAPI (Swagger) specification at `http://192.168.3.39:23357/api/docs/swagger/index.html`. This address is on a private network served over HTTP and cannot be retrieved by automated tooling. Therefore the precise endpoint paths, request schemas, and response schemas SHALL be confirmed against the Swagger specification during the design and implementation phases, and the developer may need to supply concrete endpoint details at that time. These requirements describe the integration behavior independently of the exact endpoint URLs so they remain valid once endpoint details are confirmed.

The scope of this feature is the frontend integration layer (API client, authentication, data fetching, form submission, and UI state handling). Backend implementation is out of scope.

## Glossary

- **Frontend_App**: The 犀数工场 React single-page application that runs in the user's browser.
- **API_Client**: The frontend module responsible for sending HTTP requests to the backend REST API and returning parsed responses.
- **Backend_API**: The backend REST service described by the Swagger specification at `http://192.168.3.39:23357/api/docs/swagger/index.html`.
- **Auth_Service**: The frontend module responsible for authentication, token acquisition, token storage, and attaching credentials to requests.
- **Access_Token**: A credential string issued by the Backend_API upon successful authentication and used to authorize subsequent requests.
- **Solution**: A listed company/solution record. Frontend fields: `id`, `companyName`, `logo`, `intro`, `tags`, `industryField`, `applicationLink`.
- **Company_Detail**: The extended record for a single company, including introduction text, gallery images, solution description, and case results.
- **Demand**: A listed business demand record. Frontend fields: `id`, `title`, `company`, `description`, `publishDate`, `interested`.
- **Article**: A news/announcement record. Frontend fields: `id`, `title`, `summary`, `image`, `date`, and detail fields `author`, `content`, `images`.
- **Demand_Submission**: The data a user provides to publish a new demand: company name, demand content, contact name, phone, optional email, and optional file attachments.
- **Solution_Submission**: The data a user provides to apply with a solution: company name, solution name, solution description, contact name, phone, optional email, and optional file attachments.
- **Interest_Submission**: The data a user provides to express interest in an existing demand: company name, contact name, and phone.
- **Loading_State**: A UI state indicating that a network request is in progress.
- **Error_State**: A UI state indicating that a network request failed.
- **Empty_State**: A UI state indicating that a request succeeded but returned no records.
- **Environment_Configuration**: The frontend build/runtime configuration that defines the Backend_API base URL.

## Requirements

### Requirement 1: API Client and Environment Configuration

**User Story:** As a developer, I want a single configurable API client, so that all backend calls share consistent base URL, headers, and error handling.

#### Acceptance Criteria

1. THE Frontend_App SHALL read the Backend_API base URL from Environment_Configuration.
2. WHERE no base URL is defined in Environment_Configuration, THE API_Client SHALL use a configured default base URL value.
3. WHEN the API_Client sends a request, THE API_Client SHALL set the `Content-Type` header to `application/json` for requests carrying a JSON body.
4. WHEN the Backend_API returns a success response, THE API_Client SHALL return the parsed response payload to the caller.
5. IF a network request fails to reach the Backend_API, THEN THE API_Client SHALL return an error result containing a descriptive error message.
6. IF the Backend_API returns an HTTP status code of 400 or greater, THEN THE API_Client SHALL return an error result containing the HTTP status code and any server-provided error message.

### Requirement 2: Endpoint Specification Source

**User Story:** As a developer, I want endpoint contracts derived from the Swagger specification, so that the frontend matches the actual backend interface.

#### Acceptance Criteria

1. THE Frontend_App SHALL define request and response data models for solutions, demands, articles, company details, submissions, and authentication that conform to the Swagger specification at `http://192.168.3.39:23357/api/docs/swagger/index.html`.
2. WHERE the Swagger specification field names differ from the existing frontend field names defined in `src/types/index.ts`, THE Frontend_App SHALL map Backend_API fields to the existing frontend field names.
3. WHERE a frontend field has no corresponding Backend_API field, THE Frontend_App SHALL assign a defined default value to that field.

### Requirement 3: Authentication and Login

**User Story:** As an administrator, I want to log in with my credentials, so that I can access authenticated API operations.

#### Acceptance Criteria

1. WHEN a user submits a username and password to the Auth_Service, THE Auth_Service SHALL send an authentication request to the Backend_API.
2. WHEN the Backend_API returns a successful authentication response, THE Auth_Service SHALL store the Access_Token in browser persistent storage.
3. WHEN the Auth_Service stores an Access_Token, THE API_Client SHALL include the Access_Token in the authorization header of subsequent requests to the Backend_API.
4. IF the Backend_API rejects the submitted credentials, THEN THE Auth_Service SHALL return an authentication failure result containing a descriptive error message.
5. WHEN a user requests to log out, THE Auth_Service SHALL remove the stored Access_Token from browser persistent storage.
6. IF the Backend_API returns an HTTP 401 status for an authenticated request, THEN THE Auth_Service SHALL remove the stored Access_Token from browser persistent storage.

### Requirement 4: Solutions Listing

**User Story:** As a visitor, I want to browse the list of companies and solutions, so that I can discover AI providers.

#### Acceptance Criteria

1. WHEN the SolutionsPage is displayed, THE Solution_Service SHALL request the list of Solution records from the Backend_API.
2. WHILE the solutions request is in progress, THE SolutionsPage SHALL display a Loading_State.
3. WHEN the Backend_API returns Solution records, THE SolutionsPage SHALL render one card per Solution showing company name, logo, introduction, and tags.
4. WHEN the Backend_API returns zero Solution records, THE SolutionsPage SHALL display an Empty_State with the message `暂无相关企业`.
5. IF the solutions request fails, THEN THE SolutionsPage SHALL display an Error_State with a retry control.
6. WHEN a user enters text in the solutions search field, THE SolutionsPage SHALL display only the Solution records whose company name or introduction contains the entered text.
7. WHEN a user selects an industry field filter or an application stage filter, THE SolutionsPage SHALL display only the Solution records matching the selected filter value.

### Requirement 5: Company Detail

**User Story:** As a visitor, I want to view a company's full profile, so that I can evaluate its solution and case results.

#### Acceptance Criteria

1. WHEN the CompanyDetailPage is displayed for a company identifier, THE Solution_Service SHALL request the matching Company_Detail record from the Backend_API.
2. WHILE the company detail request is in progress, THE CompanyDetailPage SHALL display a Loading_State.
3. WHEN the Backend_API returns a Company_Detail record, THE CompanyDetailPage SHALL display the company introduction, gallery images, solution description, and case results.
4. IF the requested company identifier returns no record, THEN THE CompanyDetailPage SHALL display an Error_State indicating the company was not found.
5. IF the company detail request fails, THEN THE CompanyDetailPage SHALL display an Error_State with a retry control.

### Requirement 6: Demands Listing

**User Story:** As a visitor, I want to browse published demands, so that I can find business opportunities.

#### Acceptance Criteria

1. WHEN the DemandsPage is displayed, THE Demand_Service SHALL request the list of Demand records from the Backend_API.
2. WHILE the demands request is in progress, THE DemandsPage SHALL display a Loading_State.
3. WHEN the Backend_API returns Demand records, THE DemandsPage SHALL render one card per Demand showing title, description, and source company.
4. WHEN the Backend_API returns zero Demand records, THE DemandsPage SHALL display an Empty_State with the message `暂无相关需求`.
5. IF the demands request fails, THEN THE DemandsPage SHALL display an Error_State with a retry control.
6. WHEN a user enters text in the demands search field, THE DemandsPage SHALL display only the Demand records whose title or source company contains the entered text.

### Requirement 7: Demand Detail

**User Story:** As a visitor, I want to read the full demand description, so that I can decide whether to respond.

#### Acceptance Criteria

1. WHEN the DemandDetailPage is displayed for a demand identifier, THE Demand_Service SHALL request the matching Demand record from the Backend_API.
2. WHILE the demand detail request is in progress, THE DemandDetailPage SHALL display a Loading_State.
3. WHEN the Backend_API returns a Demand record, THE DemandDetailPage SHALL display the demand title, source company, and full description.
4. IF the requested demand identifier returns no record, THEN THE DemandDetailPage SHALL display an Error_State indicating the demand was not found.
5. IF the demand detail request fails, THEN THE DemandDetailPage SHALL display an Error_State with a retry control.

### Requirement 8: News Listing and Detail

**User Story:** As a visitor, I want to read news articles, so that I can stay informed about the platform.

#### Acceptance Criteria

1. WHEN the HomePage is displayed, THE News_Service SHALL request the list of Article records from the Backend_API.
2. WHEN the Backend_API returns Article records, THE HomePage SHALL render each Article showing title, summary, image, and date.
3. WHEN the NewsDetailPage is displayed for an article identifier, THE News_Service SHALL request the matching Article record from the Backend_API.
4. WHEN the Backend_API returns an Article record, THE NewsDetailPage SHALL display the article title, author, date, content, and images.
5. IF the requested article identifier returns no record, THEN THE NewsDetailPage SHALL display an Error_State with the message `文章不存在`.
6. IF a news request fails, THEN THE affected page SHALL display an Error_State with a retry control.

### Requirement 9: Submit Demand

**User Story:** As a company representative, I want to publish a demand, so that AI providers can respond to my needs.

#### Acceptance Criteria

1. WHEN a user submits the DemandFormPage with company name, demand content, contact name, and phone provided, THE Submission_Service SHALL send a Demand_Submission request to the Backend_API.
2. IF a required field on the DemandFormPage is empty at submission time, THEN THE DemandFormPage SHALL display a validation message and SHALL withhold the request from the Backend_API.
3. IF a selected attachment file exceeds 100 megabytes, THEN THE DemandFormPage SHALL reject that file and display a size-limit message.
4. WHILE the Demand_Submission request is in progress, THE DemandFormPage SHALL display a submitting indicator and SHALL disable the submit control.
5. WHEN the Backend_API confirms the Demand_Submission, THE DemandFormPage SHALL display the success message `提交成功`.
6. IF the Demand_Submission request fails, THEN THE DemandFormPage SHALL display an error message and SHALL re-enable the submit control.

### Requirement 10: Submit Solution Application

**User Story:** As an AI provider, I want to submit my solution, so that it can be reviewed and listed.

#### Acceptance Criteria

1. WHEN a user submits the SolutionFormPage with company name, solution name, solution description, contact name, and phone provided, THE Submission_Service SHALL send a Solution_Submission request to the Backend_API.
2. IF a required field on the SolutionFormPage is empty at submission time, THEN THE SolutionFormPage SHALL display a validation message and SHALL withhold the request from the Backend_API.
3. IF a selected attachment file exceeds 100 megabytes, THEN THE SolutionFormPage SHALL reject that file and display a size-limit message.
4. WHILE the Solution_Submission request is in progress, THE SolutionFormPage SHALL display a submitting indicator and SHALL disable the submit control.
5. WHEN the Backend_API confirms the Solution_Submission, THE SolutionFormPage SHALL display the success message `提交成功`.
6. IF the Solution_Submission request fails, THEN THE SolutionFormPage SHALL display an error message and SHALL re-enable the submit control.

### Requirement 11: Express Interest in a Demand

**User Story:** As an AI provider, I want to express interest in a demand, so that the demand owner can contact me.

#### Acceptance Criteria

1. WHEN a user submits the interest form on the DemandDetailPage with company name, contact name, and phone provided, THE Submission_Service SHALL send an Interest_Submission request to the Backend_API.
2. IF a required field on the interest form is empty at submission time, THEN THE DemandDetailPage SHALL display a validation message and SHALL withhold the request from the Backend_API.
3. WHEN the Backend_API confirms the Interest_Submission, THE DemandDetailPage SHALL display the success message `提交成功`.
4. IF the Interest_Submission request fails, THEN THE DemandDetailPage SHALL display an error message and SHALL retain the entered form values.

### Requirement 12: File Attachment Upload

**User Story:** As a submitter, I want to attach supporting files, so that reviewers have complete information.

#### Acceptance Criteria

1. WHEN a submission includes one or more accepted attachment files, THE Submission_Service SHALL transmit the attachment files to the Backend_API using a multipart request.
2. THE Submission_Service SHALL restrict attachment selection to the file extensions `.pdf`, `.ppt`, `.pptx`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.zip`, and `.rar`.
3. WHILE an attachment upload is in progress, THE submitting page SHALL display the submitting indicator.
4. IF an attachment upload fails, THEN THE submitting page SHALL display an error message identifying the failure.

### Requirement 13: Request State Feedback

**User Story:** As a user, I want clear feedback during network activity, so that I understand the application state.

#### Acceptance Criteria

1. WHILE any data request is in progress, THE requesting page SHALL display a Loading_State.
2. WHEN a data request completes successfully, THE requesting page SHALL remove the Loading_State.
3. WHEN a data request fails, THE requesting page SHALL remove the Loading_State and SHALL display an Error_State.
4. WHEN a user activates a retry control in an Error_State, THE requesting page SHALL resend the failed request.

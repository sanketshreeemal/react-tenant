As your application evolves, you might find use cases for Cloud Functions:
Sending email notifications.
Generating reports.
Automating data backups.
Integrating with third-party APIs.
Performing data validation or transformation.
For example, the sandbox collection clean up, as discussed earlier, is a perfect use case for a cloud function.
If you decide to implement Cloud Functions in the future, your junior developers will need to:
Install the Firebase CLI.
Initialize Cloud Functions in your project.
Write and deploy Cloud Functions using Node.js.

**Context**
Likely Reasons for Not Having Cloud Functions:

Simple Data Operations:
If your application primarily performs basic CRUD (Create, Read, Update, Delete) operations on Firestore, these can be handled directly from the client-side or server side.
No Complex Backend Logic:
If your application doesn't require complex data processing, background tasks, or integration with external services, Cloud Functions might not be necessary.
No Real-Time Events:
If your application doesn't rely heavily on real-time events or triggers, you might not have needed Cloud Functions.
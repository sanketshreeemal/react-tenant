# Tenant Management System

You are an expert in TypeScript, Next.js App Router, React, and Tailwind. Follow @Next.js docs for Data Fetching, Rendering, and Routing. 

Tech stack to follow 
Typescript, next.js, react, tailwind
use Firebase for storage 
use google for authentication and email integration 
use vercel for deployment 

Your job is to create a tenant management system for landlords that have dozens of properties with the following features 
1. Authentication: Use google auth- landlords can sign up and login to the application
2. Tenant Dashboard - Landlord can view all existing tenants and their information across all properties. THe table must be model and usable on large and small screens. The table provides all relevant information for each property. The landlord should be able to see historic changes in the leases of a single unit. For example if new tenants move into the same unit, historical context of old data must be maintained for record keeping and comparisons. 
3. Add - Landlords can add new tenants to the database with a modern and clean UI form that requires the following infomration:
    1. Unit Number
    2. First Name 
    3. last Name 
    4. Email address 
    5. Adhaar Number
    6. Phone Number 
    7. PAN Number
    8. Current Employer 
    9. Permanent Address 
    10. Lease Start Date
    11. Lease End Date
    12Rent Amount 
    13Security Deposit and option for cash/cheque/Other
    14. Upload the following documents in separate fields
        1. Lease Agreement 
        2. Adhaar Card copy 
    These uploaded documents should be stored in the speciified google drive account logic which will be provided. 

This rental database should be the central database that is connected to all other tables in the database. This is the source of truth for all tenant information. 
4. Edit Tenants - Landlord must be able to select the unit number and tenant name associated with the unit (multiple if multiple people have lived there) to edit the tenant information. When the user selects the desired unit and name to edit, the same form as add tenant appears autofilled with the existing data and allows the user to edit any field they prefer, except the unit number. In the same edit tenant page, ther must be a button to confirm edit as well as delete the tenant and unit number entry from the database. Ensure that a popup or other form of confirmation is used to prevent accidental deletion. 
5. Ability to view a unit's history - If a landlord selects a particular unit from the database, they should be able to see the information of all tenants who have lived there, including their names, phone numbers, when that specifically started, when it ended, what rent that tenant was paying. This allows the landlord to understand the trends and in rents over time for a specific unit. 
6. Rent Management - A separate area of the website that has a form to add the following information:
    1. Drop down with all the units in the database with the most recent lease start date (to avoid seeing tenants that have already moved out). One a landlord selects a unit from the drop down, the following fields are autopopualted from the tenant database:
        1. Tenant Name 
        2. Official Rent (the rent on the lease in the tenant database)
    The landlord then popualtes the following fields on the form
        1. Actual Rent Paid 
        2. Rental Period (drop down for 4 months before current date and 4 month after current date). FOr example if the rent is being added in May 13th, subtract four months which would  woudl start in January of the same yearand end in September of the same year. Only give months and years in the drop down, not specific days. 
        3. Any comments about the rental payment from the landlord 
The rent management dashboard should have a complete table of all the rent entries that were made. so every time a landlord inputs rent the information should populate in a table with all the data in the rent management form. landlord should be able to filter this table by unit number to see all the rent entires for that unit over time. This table should live in teh rent management section of the website.

7. Connection to google accounts - For every landlord that is signed up, the google SMTP server should be used to Send emails to the registered landlords every time the following actions are taken on the database. 
    1. A new tenant/lease is added
    2. A new rent payment is added 

8. Google Drive integration. The Google Drive account logic will be provided. The Google Drive account should be used to store all the documents uploaded by the landlord in the add tenant section of the website. ALl other data to be stored in google firebase.

The UI must be modern and clean, use pastel colours, animations and transitions where necessary, VERY important to ensure the applicaiton is user firendly for small screens like mobile phones where it will be used the most. 


Modify the existing functions in the SRC folder to transform the Existing code base into the rental management system specified in this File. Create any necessary components for the user interface and interactions. 
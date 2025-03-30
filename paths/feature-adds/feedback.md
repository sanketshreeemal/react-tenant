Essential project Roadmap 
    Need to enable email functionality - Updates when new rents or leases are added + month end reports 
        Need to start and finish this piece. Having issues developing. Might hav eto break this down step by step and run this like a project prompt. Not as simple. 

    Need to update authentication once we start workign with real data - only allow certain email address to login, for now. Be able to set up user roles inside the application. 
        COMPLETE

    Prompt - 
        I want to make authentication more secure for my applicaiton. Right now, we are using google authentication, but there are no guardrails on who is allowed access. I want to set up admin access for the application such that only authorized users (based off a collection in firebase) can log in. 

        Right now, we have a collection called adminRecipients which collects a few fields - name and email. I am goign to delete this collection in the backend. Just change the all the references to adminRecipients to adminAccess such that when the new collection is created, it is named correctly. 

        Next, for authentication, i want you to Modify our Google sign-in function to check the user's email against the adminAccess collection and specifically the email field inside the records in that collection. Finally display an informative error message if that user is not authorized. 

        Create a query to find documents in the adminAccess collection where the email field matches the user's email.

        Use the existing sign in button for UI. We have @AuthContext.tsx as well as @useAuth.ts files that handle authentication. You may find other files as well if you search the code base. 




Function Changes 
    getLease and getPayment function to be updated such that when submitted to firebase, it takes with it all the unit data as well (if the unit is residential, ho wmany sqf etc) so dashboard and analysis for each active lease and rent payments becomes easy to manage, data wise. 
    The UI doesnt have to change for these functions, just what is stored in the backend for firebase. 

UI changes 
    Implement the same structure as done in Property Management for Tenants and Payments. 
        Have the carousal for the specific use case, the table below and then the forms on a separate page. 














Form Updates - Need to add new fields 
    In the property management page - need a form that lets the landlord add or subtract property groups. 
    For example - a landlord can have 3 clusters of properties in different cities or different buildings that they can track seperately as opposed to together. 
    So, the initial form and table should be for the landlord to add these property categories. 
        "HSR" - Residentail 
        "Orchid" - Commercial 

        Prompt - 
        I want to add a new button component on the top of @page.tsx next to the + Manual Add button. This button should say "+ Type". 
        When clicked, it opens a form similar to the Add Property form. Identical styling and layout. The goal of the form is to allow the user to categorize thei rproperties into separate clusters that they can choose. For example, a landlord may have three clusters of properties (whether its 3 different cities or buildings or neighborhoods etc). The form is simple - "Add property Group" with an input component. Here, the user can add property labels - say "HSR Layout". They hit submit, and in a distinctive container, a new property field is added. It need not be a table, just a list that is updated live. The user can again add more Groups like "Orchid" and hit submit. The new group will update in the list below. When the user has added all their property groups, they can click the "Exit" button which will redirect the user ot the property management page again. 

In the backend, we are creating a new collection called "property-group" that stores the groups. So if a landlord has 4 property groups, the collection will have 4 items - the name of each group. 

call this field "property-group". Up@types.d.ts file with this new string data type that we are adding to the property management page. 


    Once these datapoints are added, the form to upload new inventory must also have a drop down toggle to choose what group a perticualr unit comes from - the drop down is fields that the landlord has added from the previous form. 
        End goal is that landlord can run analytics by slicing properties through these groups or labels.     


    Tenant Form 
        If the user selects "Residential" as property type, new fields should open up as editable - 
            Square Feet of the property (this can be for both residential and commercial)
            Number of bed rooms (drop down of 1, 2, 3, 4 , 5)


        Prompt - 
            Now, we will finish up the property-management page with the finishing touches. I have received feedback from my stakeholders to add additional fields to the property records, which is what we will do. In addition to that, we will also update some designs. 

            First, lets work on updating the form with new fields. 
            1. Add a new mandatory dropdown field for recording the number of bedrooms. Call it "Number of Bedrooms" and have the drop down show 1, 2, 3, 4, 5 with the default value being "Select BHK"
            This field has conditional rendering - only appears if the user selects Residential as the property type. If the user selects commercial, this input field remains hidden. Make this robust - if the user clicks commercial, and then changes their mind to residential, or vice versa - the field's conditional rendering should work flawlessly. If the user selects residential, selects 4 in the dropdown, and then toggles back to commercial - remove this field. When th euser hits submit, the 4 should not be part of the data sent to the backend. When a commercial property is added, the numberofbedrooms field should be null. 
            To implement this, add the correct state management blocks and avoid unwanted data by constructin gthe handlesubmit functionality accordingly. THe data type should be Number. 

            2. Add another field for "Square Feet Area" which is an optional field. Here, the user adds the area in square feet for the property. Type is Number and must be positive. Simple input field is good - dont need to have sliders. If the user does not fill the field, default value to be Null. 

            Ensure these fields are added both in the Manual Add Form as well as the edit  form (pre filled when the user is trying to edit). 

            For backward compatibility, assign all old properties NULL sqf and Null BHK. But when editing units, the user can go back and update to the true values. 

            Edit the form in @page.tsx . Once the form is updated, update the Property details table in @page.tsx to include the additional "BHK" and "SQF" columns with the relevant data as well. 



    Tenant page table to have an extra column that shows how much security deposit was recorded as well.
        Given this table is really expanding, we should make the unit number column and top header row sticky within the page itself. 
        

We need to implement the same UI as we implemented on the property-mgmt page across the other two main pages 
    Payments
    Tenants 
Primarily, 
    1. We create a new page for input forms under separate folder called forms and a page.tsx file inside that. The form page handles all the input forms that the user is to submit information. Nothing changes. When the user clicks on add payment or add tenant, they are taken to the new page which has the input form. Similarly, when a user tries to edit a payment or a property, they are taken to the new page as well - the form should be pre-populated when trying to edit. 
    2. On the existing pages, we will focus only on infomration display. There will be a carousal on the top of the page, just like that of the Property page. Infomraiton will be different, but the goruping - property groups will remain. Inside each group, the relevant properties will show up, and property group specific information will be pulled for specific analytics. 
        For instance, under tenants,
            The carousal will show which units are vacant and which are occupied under each property group. 
            For empty units, it will show how long a unit has been empty and foregone rent during that time. 
            Could implement two tabs when the form is expanded - occupied and vacant. under each tab, the top card will be special - with summary statistics, then cards below will be standard property cards. 
        Under Payments 
            We will again have property groups. Inside them, we will focus on payments that are coming in at the property level. Again, the first card will be a staitics card - say "March Rent - 600, 80% collected" or something like that. Directly allows the user to see property group level performance across cash flows. 
            in the collapsed view, it can just be the unit, and payment type pill. In the expanded state, can have the rent paid as well. 
            need to figure out how to alert the user if a payment for anactive lease has not been made for a few months. Since the carousal will be Month to date, it will refresh every month. But we want to preserve, and highlight further units that havnt paid rent for many months. Maybe a separate dashboard or carosal or presentation for these units?






-----------
We should have a way to group all the different properties such that you can get consolidated data for Pragati, for Orchard, for HSR and the data that you want is both months to date rent collected as well as year to date rent collected. 

We need to add an extra column on the tenant dashboard to also show the security deposits. The idea is to be able to see in one go for what units do we still have the security deposit and when the time comes for the tenant to move out, we know how much we have and in what way we received that payment, whether it was UPI or whether it was cash or something else 

For commercial properties specifically we need to also incorporate tax on the invoice and what this means is 
    The way it should work is that you have the rent on file let's say it's 10 000 rupees on top of that the tenant is expected to pay 18 percent as a tax payment so that total payment becomes 11 800 which is what the tenant pays to the landlord then the landlord is expected to pay 10 percent of the initial rent to the government so there has to be another entry or another row or another column in the table that says what the expected rent was 10 000 what the tenant actually paid which will be 11 800 minus the 10 percent that the landlord has to pay to the government and then a final net amount which would be ideally 108 percent of the rent on the lease is what the tenant is, what the landlord should be paid and we need a way to consolidate all of these calculations such that at the end of the day you can automatically see how much of those how much taxes does the landlord eventually have to pay to the government at the end of the year. The summation of all the ten percent for all the leases for all the months. 

Need another column or another data field in the property management dashboard that also prompts the user to when they add a new when they add a new property it should ask them to group the property into certain buildings. For example we have HSR, Pragati and Orchard and we can use this to provide building level statistics on data. Rent, occupancy etc 

If a property is a residential property then the form should automatically ask the landlord or user to provide another drop down information for how many bedrooms that property has (One bedroom or two or three or more.)
Also have the square footage of each property that the user wants to add. Make all these fields optional. 

Implement the month end report
    How many units are occupied, how many units have paid rent, ho wmuch rent is due, what units, if any are empty - what is the loss from the empty units? 



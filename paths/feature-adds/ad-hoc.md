1. Leases need to be attached to property groups (in addition to property being attached to property groups). need to denormalize that field instead of using references. 
    Need to add that dropdown inside the new lease form as well as migrate existing leases by potentially manually adding a new propertyGroup field 

2. When adding a payment, the data stored does not add unitNumber to the storage. Instead it adds a leaseID and unitID. Used to query data in the back end but not intuitive to see when downloading the data which payment is mapped to which unit. Can see Tenant Name, but not their respective Unit Numbers. 
    Need to add Unit Number field everytime a payment is stored in the back end to map the payment to the unit number that payment is being recorded for. 
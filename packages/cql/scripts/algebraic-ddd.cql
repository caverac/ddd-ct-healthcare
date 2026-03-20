# ==========================================================================
# Algebraic Domain-Driven Design in CQL
#
# CQL formalization of:
#   "Algebraic Domain-Driven Design: A Categorical Semantics for
#    Consistency in Healthcare Provider Directories"
#
# DDD concept              CQL construct
# ---------------------    --------------------------------------
# Bounded Context       ->  Schema (finitely presented category)
# Aggregate             ->  Entity within a schema
# Anti-Corruption Layer ->  Mapping (functor between schemas)
# Entity Resolution     ->  schema_colimit + sigma + coproduct
#                           + quotient_query  (Sec 3--4, Thm 4.1)
# Schema Translation    ->  sigma Sigma_F, delta Delta_F  (Sec 6)
# Referential Integrity ->  constraints + check + chase (Thm 6.1)
#
# ==========================================================================


###########################################################################
# Typeside
#
# Shared type system across all bounded contexts. Imports SQL types
# and defines toUpper for case-insensitive matching during entity
# resolution (used to model the NPI key comparison).
###########################################################################

typeside Ty = literal {
    imports
        sql
    external_functions
        toUpper : String -> String = "x => x.isPresent() ? java.util.Optional.of(x.get().toUpperCase()) : java.util.Optional.empty()"
}


###########################################################################
# Section 3: The Category of Keyed Fragments (Definitions 3.1--3.2)
#
# A keyed fragment is a pair (S, kappa: S -> K). The key set K is the
# set of National Provider Identifiers (NPIs). Every bounded context
# schema imports ProviderKeySchema, making Provider (identified by
# NPI) the shared global key.
###########################################################################

schema ProviderKeySchema = literal : Ty {
    entities
        Provider
    attributes
        npi : Provider -> String
}


###########################################################################
# Bounded Context Schemas
#
# Each schema is a finitely presented category extending ProviderKeySchema.
# Foreign keys to Provider are the key maps kappa: S -> K (Definition 3.1).
#
# Per Table 1 of the paper:
#   Bounded Context = Category
#   Aggregate       = Object (entity)
###########################################################################

# EHR Context: source of truth for clinic locations (Section 2.3)
schema EHRSchema = literal : Ty {
    imports
        ProviderKeySchema
    entities
        Clinic
    foreign_keys
        practicedAt : Provider -> Clinic
    attributes
        providerName : Provider -> String
        address      : Clinic   -> String
}

# Credentialing Context: source of truth for licenses (Section 2.3)
schema CredSchema = literal : Ty {
    imports
        ProviderKeySchema
    entities
        License
    foreign_keys
        holds : Provider -> License
    attributes
        providerName : Provider -> String
        licenseNum   : License  -> String
        licenseState : License  -> String
}

# Contracting Context: source of truth for network enrollment (Section 2.3)
schema ContractSchema = literal : Ty {
    imports
        ProviderKeySchema
    entities
        Network
        Enrollment
    foreign_keys
        inNetwork : Enrollment -> Network
        enrolled  : Enrollment -> Provider
    attributes
        networkName : Network -> String
}


###########################################################################
# Section 4: Instance Data (Example 4.1)
#
# Two providers across three bounded contexts:
#   Dr. Jane Doe  (NPI-1234567890) -- in all three contexts
#   Dr. John Smith (NPI-9876543210) -- in EHR and Contracting only
#
# Each instance is a Set-valued functor on its schema category.
###########################################################################

instance EHRData = literal : EHRSchema {
    generators
        doe_ehr   : Provider
        smith_ehr : Provider
        downtown  : Clinic
        oakst     : Clinic
    equations
        doe_ehr.npi            = "NPI-1234567890"
        doe_ehr.providerName   = "Dr. Jane Doe"
        doe_ehr.practicedAt    = downtown
        downtown.address       = "100 Downtown Ave"

        smith_ehr.npi          = "NPI-9876543210"
        smith_ehr.providerName = "Dr. John Smith"
        smith_ehr.practicedAt  = oakst
        oakst.address          = "200 Oak Street"
}

instance CredData = literal : CredSchema {
    generators
        doe_cred  : Provider
        mdLicense : License
    equations
        doe_cred.npi          = "NPI-1234567890"
        doe_cred.providerName = "Dr. Jane Doe"
        doe_cred.holds        = mdLicense
        mdLicense.licenseNum  = "MD-98765"
        mdLicense.licenseState = "CA"
}

instance ContractData = literal : ContractSchema {
    generators
        doe_contract   : Provider
        smith_contract : Provider
        bluecross      : Network
        aetna          : Network
        enroll_doe_bc  : Enrollment
        enroll_doe_ae  : Enrollment
        enroll_smith   : Enrollment
    equations
        doe_contract.npi        = "NPI-1234567890"
        smith_contract.npi      = "NPI-9876543210"
        bluecross.networkName   = "BlueCross"
        aetna.networkName       = "Aetna"
        enroll_doe_bc.inNetwork = bluecross
        enroll_doe_bc.enrolled  = doe_contract
        enroll_doe_ae.inNetwork = aetna
        enroll_doe_ae.enrolled  = doe_contract
        enroll_smith.inNetwork  = aetna
        enroll_smith.enrolled   = smith_contract
}


###########################################################################
# Section 4: Schema Colimit -- Universal Directory Schema (Theorem 4.1)
#
# The colimit (pushout) of bounded context schemas computes the
# "smallest" schema that all source schemas map into. This is the
# universal property: the directory schema is determined by the
# overlap structure of the source schemas.
#
# entity_equations identify Provider across contexts.
# observation_equations identify the NPI attribute across contexts.
###########################################################################

schema_colimit DirectoryColimit = quotient EHRSchema + CredSchema + ContractSchema : Ty {
    entity_equations
        EHRSchema.Provider  = CredSchema.Provider
        CredSchema.Provider = ContractSchema.Provider
    observation_equations
        # NPI is the global key -- same across all contexts
        forall x. x.EHRSchema_Provider_npi = x.CredSchema_Provider_npi
        forall x. x.CredSchema_Provider_npi = x.ContractSchema_Provider_npi
    options
        simplify_names = false
}


###########################################################################
# Clean up auto-generated colimit names.
#
# The raw colimit produces names like EHRSchema_Provider_practicedAt.
# The modify operation renames for readability and removes redundant
# attributes (NPI copies that are provably equal via the
# observation_equations above).
###########################################################################

schema_colimit CleanDirectory = modify DirectoryColimit {
    rename entities
        EHRSchema_Provider        -> Provider
        EHRSchema_Clinic          -> Clinic
        CredSchema_License        -> License
        ContractSchema_Network    -> Network
        ContractSchema_Enrollment -> Enrollment
    rename foreign_keys
        Provider.EHRSchema_Provider_practicedAt        -> practicedAt
        Provider.CredSchema_Provider_holds             -> holds
        Enrollment.ContractSchema_Enrollment_inNetwork -> inNetwork
        Enrollment.ContractSchema_Enrollment_enrolled  -> enrolled
    rename attributes
        Provider.EHRSchema_Provider_npi                -> npi
        Provider.EHRSchema_Provider_providerName       -> ehrName
        Provider.CredSchema_Provider_npi               -> credNpi
        Provider.CredSchema_Provider_providerName      -> credName
        Provider.ContractSchema_Provider_npi           -> contractNpi
        Clinic.EHRSchema_Clinic_address                -> address
        License.CredSchema_License_licenseNum          -> licenseNum
        License.CredSchema_License_licenseState        -> licenseState
        Network.ContractSchema_Network_networkName     -> networkName
    remove attributes
        # These are provably equal to npi (via observation_equations)
        Provider.credNpi     -> lambda x. x.npi
        Provider.contractNpi -> lambda x. x.npi
}


###########################################################################
# Section 6: Extract schema and mappings
#
# The colimit induces canonical mappings (functors) from each source
# schema into the directory. These are the cocone components.
# Each mapping is used for Sigma (push forward) and Delta (pull back).
###########################################################################

schema  DirectorySchema     = getSchema  CleanDirectory
mapping EHRToDirectory      = getMapping CleanDirectory EHRSchema
mapping CredToDirectory     = getMapping CleanDirectory CredSchema
mapping ContractToDirectory = getMapping CleanDirectory ContractSchema


###########################################################################
# Section 4 & 6: Functorial Data Migration -- Sigma (Sigma_F)
#
# Sigma is the left Kan extension: the left adjoint in the adjoint
# triple Sigma_F -| Delta_F -| Pi_F (Section 6, Theorem 6.1).
#
# It pushes data forward from each source schema into the directory.
# Where the source schema lacks entities present in the directory
# (e.g., EHR has no License), Sigma freely generates placeholder
# elements -- this is the universal property of the left adjoint.
#
# Example: Dr. Smith exists in EHR but not Cred. After Sigma, his
# Provider record in the directory gets a Skolem-generated License
# (the "free" extension). The constraints section below detects this.
###########################################################################

instance EHRForward      = sigma EHRToDirectory      EHRData
instance CredForward     = sigma CredToDirectory     CredData
instance ContractForward = sigma ContractToDirectory ContractData


###########################################################################
# Disjoint union (coproduct of instances)
#
# All records from all contexts, side by side. No deduplication yet.
# Dr. Doe appears as THREE separate Provider records (one per context).
# Dr. Smith appears as TWO (EHR + Contract, not in Cred).
###########################################################################

instance UnmergedDirectory = coproduct EHRForward + CredForward + ContractForward : DirectorySchema


###########################################################################
# Section 4: Entity Resolution via Quotient (Theorem 4.1)
#
# The colimit construction: disjoint union S = U Sj, then quotient
# by the equivalence relation ~ generated by NPI equality.
#   x ~ y  iff  kappa(x) = kappa(y)
#
# quotient_query identifies Provider records sharing the same NPI.
# The identification propagates through foreign keys: after merging
# Doe's three Provider records, her Clinic, License, and Enrollments
# are all reachable from the single merged Provider.
#
###########################################################################

instance Directory = quotient_query UnmergedDirectory {
    entity Provider -> {
        from p1:Provider p2:Provider
        where p1.npi = p2.npi
    }
    options
        quotient_use_chase = false
}


###########################################################################
# Section 6: Round-trip via Delta (Delta_F) -- pullback / reindexing
#
# Delta_F is the right adjoint: it projects the merged directory back onto
# the EHR source schema by precomposition with the mapping functor.
#
# The unit of the Sigma -| Delta adjunction witnesses how original EHR data
# embeds into the round-trip. Nothing from EHR is lost, and data from
# Cred and Contract becomes visible (e.g., the round-tripped EHR view
# now "sees" license and enrollment information).
###########################################################################

instance RoundTripEHR = delta EHRToDirectory Directory
transform EHRUnitMap  = unit  EHRToDirectory EHRData


###########################################################################
# Query: project directory to provider keys
#
# CQL queries are profunctors between schemas. This projects the full
# directory down to the ProviderKeySchema, keeping only Provider + NPI.
# Demonstrates functorial composition of migrations.
###########################################################################

query DirectoryToKeys = literal : DirectorySchema -> ProviderKeySchema {
    entity Provider -> {
        from p : Provider
        attributes
            npi -> p.npi
    }
}

instance ProviderKeys = eval DirectoryToKeys Directory


###########################################################################
# Section 6: Referential Integrity Constraints (Theorem 6.1)
#
# Embedded dependencies (EDs) encoding structural integrity of the
# merged directory. Constraints expressible as pullback squares are
# preserved by Delta_F (Theorem 6.1).
#
# Two types of constraints:
#   EGD (equality-generating): injectivity of enrollment
#   TGD (tuple-generating):    every enrollment has a valid provider
###########################################################################

constraints DirectoryIntegrity = literal : DirectorySchema {
    # EGD: no two enrollments for the same provider in the same network
    forall e1 e2 : Enrollment
        where e1.inNetwork = e2.inNetwork
              e1.enrolled  = e2.enrolled
        -> where e1 = e2

    # TGD: every enrollment references a valid provider
    forall e : Enrollment ->
        exists p : Provider
        where e.enrolled = p
}

command verifyIntegrity = check DirectoryIntegrity Directory


###########################################################################
# Chase: universal repair of a non-compliant instance
#
# The chase algorithm computes the left adjoint to the inclusion of
# constraint-satisfying instances into all instances. It produces the
# "free" repair: the smallest change that makes constraints hold.
#
# Example: two enrollments for Dr. Duplicate in BlueCross violate the
# injectivity constraint. The chase merges them into one enrollment.
###########################################################################

instance DuplicateEnrollment = literal : DirectorySchema {
    generators
        doc       : Provider
        clinic1   : Clinic
        lic1      : License
        bcNet     : Network
        enrollA   : Enrollment
        enrollB   : Enrollment
    equations
        doc.npi       = "NPI-5555555555"
        doc.ehrName   = "Dr. Duplicate"
        doc.credName  = "Dr. Duplicate"
        doc.practicedAt = clinic1
        doc.holds       = lic1
        clinic1.address      = "300 Main St"
        lic1.licenseNum      = "MD-11111"
        lic1.licenseState    = "TX"
        bcNet.networkName    = "BlueCross"
        # Two enrollments for the same provider+network -- violates EGD
        enrollA.inNetwork = bcNet
        enrollA.enrolled  = doc
        enrollB.inNetwork = bcNet
        enrollB.enrolled  = doc
}

instance RepairedEnrollment = chase DirectoryIntegrity DuplicateEnrollment


###########################################################################
# Visualization: pivot the directory into a graph
#
# Pivot turns a specific instance into a schema where every row becomes
# an entity and every FK value becomes a morphism -- useful for
# inspecting the merged directory structure.
###########################################################################

schema DirectoryGraph = pivot Directory

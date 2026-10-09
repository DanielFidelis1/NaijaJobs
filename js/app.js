// ================================
// NAIJAJOBS - SUPABASE CONNECTION
// ================================

const SUPABASE_URL =
    "https://uzcyorfqkmikgpmfqqcf.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_MkiEBVs-uQpKsKNsVt2jsQ_zFwK-2Nc";


const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );

// ================================
// SIGN UP
// ================================

const signupForm =
    document.getElementById("signup-form");

if (signupForm) {

    signupForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const fullName =
                document.getElementById("full-name").value.trim();

            const email =
                document.getElementById("email").value.trim();

            const password =
                document.getElementById("password").value;

            const accountType =
                document.getElementById("account-type").value;

            const message =
                document.getElementById("signup-message");

            message.textContent = "Creating your account...";

            try {

                const {
                    data,
                    error
                } = await supabaseClient.auth.signUp({

                    email: email,
                    password: password,

                    options: {
                        data: {
                            full_name: fullName,
                            account_type: accountType
                        }
                    }

                });

                if (error) {
                    console.error("Signup error:", error);
                    message.textContent = error.message;
                    return;
                }

                if (!data.user) {
                    message.textContent =
                        "Account could not be created. Please try again.";
                    return;
                }

                // Save the profile only when a session exists.
                // If email confirmation is required, the profile
                // should instead be created by a secure database trigger.

                
if (data.session) {

    message.textContent =
        "Account created successfully!";

    setTimeout(function () {
        window.location.href = "login.html";
    }, 1500);

} else {

    message.textContent =
        "Account created! Please check your email and confirm your account before logging in.";

}
            } catch (error) {

                console.error("Unexpected error:", error);

                message.textContent =
                    "Something went wrong. Please try again.";

            }

        }
    );

}


 
 // ================================
 // LOGIN WITH SUSPENSION CHECK
 // ================================

const loginForm = document.getElementById("login-form");

if (loginForm) {
    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const message = document.getElementById("login-message");

        message.textContent = "Logging in...";

        try {
            const { data, error } =
                await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password
                });

            if (error) {
                console.error("Login error:", error);
                message.textContent = error.message;
                return;
            }

            if (!data.user) {
                message.textContent =
                    "Login failed. Please try again.";
                return;
            }

            // Check whether this user is an administrator.
            message.textContent = "Checking account permissions...";

            const { data: admin, error: adminError } =
                await supabaseClient
                    .from("admin_users")
                    .select("user_id")
                    .eq("user_id", data.user.id)
                    .maybeSingle();

            if (adminError) {
                console.error("Admin verification error:", adminError);
                await supabaseClient.auth.signOut();

                message.textContent =
                    "Permissions could not be verified. Please try again.";
                return;
            }

            // Check suspension for non-admin users.
            if (!admin) {
                message.textContent = "Checking account status...";

                const { data: profile, error: profileError } =
                    await supabaseClient
                        .from("profiles")
                        .select("is_suspended")
                        .eq("id", data.user.id)
                        .maybeSingle();

                if (profileError || !profile) {
                    console.error(
                        "Account status check failed:",
                        profileError
                    );

                    await supabaseClient.auth.signOut();

                    message.textContent =
                        "We couldn't verify your account status. Please try again.";
                    return;
                }

                if (profile.is_suspended === true) {
                    await supabaseClient.auth.signOut();

                    message.textContent =
                        "Your account has been suspended. Please contact NaijaJobs support.";

                    return;
                }
            }

            message.textContent = "Login successful!";

            setTimeout(function () {
                if (admin) {
                    window.location.href = "admin-dashboard.html";
                } else {
                    window.location.href = "dashboard.html";
                }
            }, 700);

        } catch (error) {
            console.error("Login error:", error);

            message.textContent =
                "Something went wrong. Please try again.";
        }
    });
}
// ========================================
// POST A JOB
// ========================================

const postJobForm = document.getElementById("post-job-form");

if (postJobForm) {

postJobForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const message =
        document.getElementById("post-job-message");

    message.textContent = "Posting your job...";

    try {

        // Check logged-in user
        const {
            data: {
                user
            },
            error: authError
        } = await supabaseClient.auth.getUser();


        if (authError || !user) {

            window.location.href = "login.html";

            return;
        }


        // Get form values
        const title =
            document.getElementById("job-title").value.trim();

        const description =
            document.getElementById("job-description").value.trim();

        const category =
            document.getElementById("job-category").value;

        const budget =
            Number(
                document.getElementById("job-budget").value
            );

        const location =
            document.getElementById("job-location").value.trim();

        const jobType =
            document.getElementById("job-type").value;

        const deadline =
            document.getElementById("job-deadline").value;


        // Insert job
        const {
            data,
            error
        } = await supabaseClient
            .from("jobs")
            .insert([
                {
                    user_id: user.id,
                    title: title,
                    description: description,
                    category: category,
                    budget: budget,
                    location: location,
                    job_type: jobType,
                    deadline: deadline,
                    status: "open"
                }
            ])
            .select();


        if (error) {

            console.error("Job posting error:", error);

            message.textContent =
                "Could not post your job: " + error.message;

            return;
        }


        message.textContent =
            "Job posted successfully!";


        // Clear form
        postJobForm.reset();


        // Take user to browse jobs
        setTimeout(function () {

            window.location.href = "browse.html";

        }, 1000);


    } catch (error) {

        console.error(error);

        message.textContent =
            "Something went wrong. Please try again.";

    }

});

}
// ========================================
// BROWSE JOBS
// ========================================

const jobsContainer =
document.getElementById("jobs-container");

if (jobsContainer) {

let allJobs = [];


async function loadJobs() {

    jobsContainer.innerHTML =
        "<p>Loading jobs...</p>";


    try {

        const {
            data: jobs,
            error
        } = await supabaseClient
            .from("jobs")
            .select("*")
            .eq("status", "open")
            .order("created_at", {
                ascending: false
            });


        if (error) {

            console.error("Jobs loading error:", error);

            jobsContainer.innerHTML =
                "<p>Could not load jobs.</p>";

            return;
        }


        allJobs = jobs || [];

        displayJobs(allJobs);


    } catch (error) {

        console.error(error);

        jobsContainer.innerHTML =
            "<p>Something went wrong.</p>";

    }

}


function displayJobs(jobs) {

    if (!jobs.length) {

        jobsContainer.innerHTML =
            "<p>No jobs found.</p>";

        return;
    }


    jobsContainer.innerHTML = "";


    jobs.forEach(function (job) {

        const jobCard =
            document.createElement("div");

        jobCard.className = "job-card";


        const formattedBudget =
            Number(job.budget).toLocaleString();


        jobCard.innerHTML = `

            <div class="job-card-content">

                <span class="job-category">
                    ${escapeHTML(job.category)}
                </span>

                <h3>
                    ${escapeHTML(job.title)}
                </h3>

                <p class="job-description">
                    ${escapeHTML(job.description)}
                </p>

                <div class="job-details">

                    <span>
                        ₦${formattedBudget}
                    </span>

                    <span>
                        ${escapeHTML(job.location)}
                    </span>

                    <span>
                        ${escapeHTML(job.job_type)}
                    </span>

                </div>

                <p class="job-deadline">
                    Deadline: ${escapeHTML(job.deadline)}
                </p>

                <a
                    href="job.html?id=${job.id}"
                    class="job-button"
                >
                    View Job
                </a>

            </div>

        `;


        jobsContainer.appendChild(jobCard);

    });

}


function filterJobs() {

    const searchValue =
        document
            .getElementById("job-search")
            .value
            .toLowerCase()
            .trim();


    const categoryValue =
        document
            .getElementById("category-filter")
            .value;


    const filteredJobs =
        allJobs.filter(function (job) {

            const matchesSearch =
                job.title
                    .toLowerCase()
                    .includes(searchValue) ||

                job.description
                    .toLowerCase()
                    .includes(searchValue) ||

                job.category
                    .toLowerCase()
                    .includes(searchValue);


            const matchesCategory =
                !categoryValue ||
                job.category === categoryValue;


            return (
                matchesSearch &&
                matchesCategory
            );

        });


    displayJobs(filteredJobs);

}


const searchInput =
    document.getElementById("job-search");

const categoryFilter =
    document.getElementById("category-filter");


if (searchInput) {

    searchInput.addEventListener(
        "input",
        filterJobs
    );

}


if (categoryFilter) {

    categoryFilter.addEventListener(
        "change",
        filterJobs
    );

}


loadJobs();

}

// ========================================
// ESCAPE HTML
// ========================================

function escapeHTML(value) {


if (value === null || value === undefined) {
    return "";
}

return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");


}
// ========================================
// JOB DETAILS
// ========================================

const jobDetailsContainer =
document.getElementById(
"job-details-container"
);

if (jobDetailsContainer) {

async function loadJobDetails() {

    // Get job ID from URL
    const params =
        new URLSearchParams(
            window.location.search
        );

    const jobId =
        params.get("id");


    if (!jobId) {

        jobDetailsContainer.innerHTML = `
            <p>Job not found.</p>
        `;

        return;
    }


    try {

        const {
            data: job,
            error
        } = await supabaseClient
            .from("jobs")
            .select("*")
            .eq("id", jobId)
            .single();


        if (error) {

            console.error(
                "Job details error:",
                error
            );

            jobDetailsContainer.innerHTML = `
                <p>Could not load this job.</p>
            `;

            return;
        }


        const budget =
            Number(job.budget).toLocaleString();


        jobDetailsContainer.innerHTML = `

            <div class="job-details-card">

                <span class="job-category">
                    ${escapeHTML(job.category)}
                </span>


                <h1>
                    ${escapeHTML(job.title)}
                </h1>


                <div class="job-meta">

                    <span>
                        💰 ₦${budget}
                    </span>

                    <span>
                        📍 ${escapeHTML(job.location)}
                    </span>

                    <span>
                        💼 ${escapeHTML(job.job_type)}
                    </span>

                    <span>
                        📅 ${escapeHTML(job.deadline)}
                    </span>

                </div>


                <hr>


                <h2>
                    Job Description
                </h2>


                <p class="full-job-description">
                    ${escapeHTML(job.description)}
                </p>


                <div class="job-action">

                    <button
                        id="apply-job-button"
                        class="apply-button"
                    >
                        Apply for This Job
                    </button>

                </div>

            </div>

        `;


        const applyButton =
            document.getElementById(
                "apply-job-button"
            );


        if (applyButton) {

applyButton.addEventListener(
    "click",
    async function () {

        // Check if user is logged in
        const {
            data: {
                user
            },
            error: authError
        } = await supabaseClient.auth.getUser();


        if (authError || !user) {

            window.location.href =
                "login.html";

            return;
        }


        // Prevent the job owner from applying
        if (user.id === job.user_id) {

            alert(
                "You cannot apply for your own job."
            );

            return;
        }


        // Show application form
        const existingForm =
            document.getElementById(
                "application-form"
            );

        if (existingForm) {
            return;
        }


        const applicationForm =
            document.createElement("div");

        applicationForm.id =
            "application-form";

        applicationForm.className =
            "application-form";


        applicationForm.innerHTML = `

            <h2>
                Apply for This Job
            </h2>

            <p>
                Tell the client why you are a good fit
                for this job.
            </p>

            <textarea
                id="cover-message"
                placeholder="Write your application message..."
                rows="6"
                required
            ></textarea>

            <button
                id="submit-application"
                class="apply-button"
            >
                Submit Application
            </button>

            <p
                id="application-message"
                class="form-message"
            ></p>

        `;


        document
            .querySelector(".job-action")
            .appendChild(applicationForm);


        const submitApplication =
            document.getElementById(
                "submit-application"
            );


        submitApplication.addEventListener(
            "click",
            async function () {

                const coverMessage =
                    document
                        .getElementById(
                            "cover-message"
                        )
                        .value
                        .trim();


                const applicationMessage =
                    document.getElementById(
                        "application-message"
                    );


                if (!coverMessage) {

                    applicationMessage.textContent =
                        "Please write a message before applying.";

                    return;
                }


                submitApplication.disabled =
                    true;

                submitApplication.textContent =
                    "Submitting...";


                try {

                    const {
                        error
                    } = await supabaseClient
                        .from("applications")
                        .insert([
                            {
                                job_id: job.id,
                                user_id: user.id,
                                cover_message:
                                    coverMessage,
                                status: "pending"
                            }
                        ]);


                    if (error) {

                        console.error(
                            "Application error:",
                            error
                        );

                        applicationMessage.textContent =
                            error.message;

                        submitApplication.disabled =
                            false;

                        submitApplication.textContent =
                            "Submit Application";

                        return;
                    }


                    applicationMessage.textContent =
                        "Application submitted successfully!";

                    applicationMessage.style.color =
                        "green";

                    submitApplication.textContent =
                        "Application Submitted";


                    document
                        .getElementById(
                            "cover-message"
                        )
                        .disabled = true;


                } catch (error) {

                    console.error(error);

                    applicationMessage.textContent =
                        "Something went wrong. Please try again.";

                    submitApplication.disabled =
                        false;

                    submitApplication.textContent =
                        "Submit Application";

                }

            }
        );

    }
);


}


    } catch (error) {

        console.error(error);

        jobDetailsContainer.innerHTML = `
            <p>
                Something went wrong while loading this job.
            </p>
        `;

    }

}


loadJobDetails();


}
// ========================================
// MY APPLICATIONS
// ========================================

const applicationsContainer =
document.getElementById(
"applications-container"
);

if (applicationsContainer) {

async function loadApplications() {

    try {

        // Check logged-in user
        const {
            data: {
                user
            },
            error: authError
        } = await supabaseClient.auth.getUser();


        if (authError || !user) {

            window.location.href =
                "login.html";

            return;
        }


        // Get applications
        const {
            data: applications,
            error
        } = await supabaseClient
            .from("applications")
            .select(`
                id,
                cover_message,
                status,
                created_at,
                jobs (
                    id,
                    title,
                    category,
                    budget,
                    location,
                    job_type,
                    deadline
                )
            `)
            .eq("user_id", user.id)
            .order("created_at", {
                ascending: false
            });


        if (error) {

            console.error(
                "Applications error:",
                error
            );

            applicationsContainer.innerHTML =
                "<p>Could not load your applications.</p>";

            return;
        }


        if (!applications || !applications.length) {

            applicationsContainer.innerHTML = `

                <div class="empty-applications">

                    <h2>
                        No applications yet
                    </h2>

                    <p>
                        Find a job and submit your first application.
                    </p>

                    <a
                        href="browse.html"
                        class="apply-button"
                    >
                        Find Jobs
                    </a>

                </div>

            `;

            return;
        }


        applicationsContainer.innerHTML = "";


        applications.forEach(function (application) {

            const job =
                application.jobs;


            if (!job) {
                return;
            }


            const card =
                document.createElement("div");

            card.className =
                "application-card";


            const budget =
                Number(job.budget)
                    .toLocaleString();


            let statusClass =
                "status-pending";


            if (application.status === "accepted") {

                statusClass =
                    "status-accepted";

            }

            else if (application.status === "rejected") {

                statusClass =
                    "status-rejected";

            }


            card.innerHTML = `

                <div class="application-card-top">

                    <div>

                        <span class="job-category">
                            ${escapeHTML(job.category)}
                        </span>

                        <h2>
                            ${escapeHTML(job.title)}
                        </h2>

                    </div>


                    <span class="application-status ${statusClass}">
                        ${escapeHTML(application.status)}
                    </span>

                </div>


                <div class="application-details">

                    <span>
                        💰 ₦${budget}
                    </span>

                    <span>
                        📍 ${escapeHTML(job.location)}
                    </span>

                    <span>
                        💼 ${escapeHTML(job.job_type)}
                    </span>

                </div>


                <p class="application-message">

                    <strong>
                        Your message:
                    </strong>

                    ${escapeHTML(
                        application.cover_message
                    )}

                </p>


                <p class="application-date">

                    Applied:
                    ${new Date(
                        application.created_at
                    ).toLocaleDateString()}

                </p>


                <a
                    href="job.html?id=${job.id}"
                    class="job-button"
                >
                    View Job
                </a>

            `;


            applicationsContainer.appendChild(
                card
            );

        });

    } catch (error) {

        console.error(error);

        applicationsContainer.innerHTML =
            "<p>Something went wrong.</p>";

    }

}


loadApplications();


}
// ========================================
// MY JOBS
// ========================================

const myJobsContainer =
document.getElementById(
"my-jobs-container"
);

if (myJobsContainer) {

async function loadMyJobs() {

    try {

        // Check logged-in user
        const {
            data: {
                user
            },
            error: authError
        } = await supabaseClient.auth.getUser();


        if (authError || !user) {

            window.location.href =
                "login.html";

            return;
        }


        // Load jobs posted by this user
        const {
            data: jobs,
            error
        } = await supabaseClient
            .from("jobs")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", {
                ascending: false
            });


        if (error) {

            console.error(
                "My jobs error:",
                error
            );

            myJobsContainer.innerHTML =
                "<p>Could not load your jobs.</p>";

            return;
        }


        if (!jobs || !jobs.length) {

            myJobsContainer.innerHTML = `

                <div class="empty-my-jobs">

                    <h2>
                        You haven't posted any jobs yet.
                    </h2>

                    <p>
                        Post your first job and start receiving applications.
                    </p>

                    <a
                        href="post-job.html"
                        class="apply-button"
                    >
                        Post a Job
                    </a>

                </div>

            `;

            return;
        }


        myJobsContainer.innerHTML = "";


        jobs.forEach(function (job) {

            const card =
                document.createElement("div");

            card.className =
                "my-job-card";


            const budget =
                Number(job.budget)
                    .toLocaleString();


            card.innerHTML = `

                <div class="my-job-top">

                    <div>

                        <span class="job-category">
                            ${escapeHTML(job.category)}
                        </span>

                        <h2>
                            ${escapeHTML(job.title)}
                        </h2>

                    </div>


                    <span class="my-job-status">
                        ${escapeHTML(job.status)}
                    </span>

                </div>


                <p class="my-job-description">
                    ${escapeHTML(job.description)}
                </p>


                <div class="application-details">

                    <span>
                        💰 ₦${budget}
                    </span>

                    <span>
                        📍 ${escapeHTML(job.location)}
                    </span>

                    <span>
                        💼 ${escapeHTML(job.job_type)}
                    </span>

                    <span>
                        📅 ${escapeHTML(job.deadline)}
                    </span>

                </div>


                <div class="my-job-actions">

                    <a
                        href="job.html?id=${job.id}"
                        class="job-button"
                    >
                        View Job
                    </a>
                    
                    <a
    href="applicants.html?id=${job.id}"
    class="job-button secondary-job-button"
>
    View Applicants
</a>


                </div>

            `;


            myJobsContainer.appendChild(card);

        });

    } catch (error) {

        console.error(error);

        myJobsContainer.innerHTML =
            "<p>Something went wrong.</p>";

    }

}


loadMyJobs();


}

// ========================================
// JOB APPLICANTS
// ========================================

const applicantsContainer =
document.getElementById(
    "applicants-container"
);

if (applicantsContainer) {

async function loadApplicants() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    const jobId =
        params.get("id");


    if (!jobId) {
        return;
    }


    try {

        // ================================
        // CHECK LOGGED-IN USER
        // ================================

        const {
            data: {
                user
            }
        } =
            await supabaseClient.auth.getUser();


        if (!user) {
            return;
        }


        // ================================
        // GET JOB OWNER
        // ================================

        const {
            data: job,
            error: jobError
        } =
            await supabaseClient
                .from("jobs")
                .select("user_id")
                .eq("id", jobId)
                .single();


        if (jobError || !job) {

            console.error(
                "Job error:",
                jobError
            );

            return;
        }


        // ================================
        // ONLY JOB OWNER CAN SEE APPLICANTS
        // ================================

        if (job.user_id !== user.id) {

            applicantsContainer.innerHTML = "";

            return;
        }


        // ================================
        // GET APPLICATIONS
        // ================================

        const {
            data: applications,
            error
        } =
            await supabaseClient
                .from("applications")
                .select(`
                    id,
                    user_id,
                    cover_message,
                    status,
                    created_at
                `)
                .eq("job_id", jobId)
                .order("created_at", {
                    ascending: false
                });


        if (error) {

            console.error(
                "Applicants error:",
                error
            );

            applicantsContainer.innerHTML = `
                <p>
                    Could not load applicants.
                </p>
            `;

            return;
        }


        // ================================
        // NO APPLICANTS
        // ================================

        if (
            !applications ||
            !applications.length
        ) {

            applicantsContainer.innerHTML = `

                <h2>
                    Applicants
                </h2>

                <div class="no-applicants">

                    <p>
                        No one has applied for this job yet.
                    </p>

                </div>

            `;

            return;
        }


        // ================================
        // GET APPLICANT USER IDs
        // ================================

        const applicantIds =
            applications.map(
                function (application) {

                    return application.user_id;

                }
            );


        
        // ================================
        // GET APPLICANT PROFILES
        // ================================

        const {
            data: profiles,
            error: profileError
        } = await supabaseClient
            .from("profiles")
            .select(`
                id,
                full_name,
                location,
                skills
            `);

        if (profileError) {
            console.error(
                "Profile loading error:",
                profileError
            );
        }

        console.log("Applications:", applications);
        console.log("All returned profiles:", profiles);

        applications.forEach(function (application) {

            const profile = profiles?.find(function (item) {
                return item.id === application.user_id;
            });

            console.log("Application user ID:", application.user_id);
            console.log("Matched profile:", profile);
            console.log("Applicant location:", profile?.location);
            console.log("Applicant skills:", profile?.skills);

        });

        // ================================
        // APPLICANTS HEADING
        // ================================

        applicantsContainer.innerHTML = `

            <h2>
                Applicants
            </h2>

        `;


        // ================================
        // CREATE APPLICANT CARDS
        // ================================

        applications.forEach(
            function (application) {

                const card =
                    document.createElement("div");

                card.className =
                    "applicant-card";


                const status =
                    application.status ||
                    "pending";


                // Find matching profile
                const profile =
                profiles?.find(
                    function (item) {
                        return (
                            String(item.id) ===
                            String(application.user_id)
                        );
                    }
                );


                const fullName =
                    profile?.full_name ||
                    "Applicant";


                const location =
                    profile?.location ||
                    "Location not provided";


                const skills =
                    profile?.skills ||
                    "Skills not provided";


                // ================================
                // CARD HTML
                // ================================

                card.innerHTML = `

                    <div class="applicant-top">

                        <div>

                            <h3>
                                ${escapeHTML(
                                    fullName
                                )}
                            </h3>

                            <p class="applicant-id">

                                Application ID:
                                ${escapeHTML(
                                    application.id
                                )}

                            </p>

                        </div>


                        <span
                            class="application-status status-${escapeHTML(
                                status
                            )}"
                        >

                            ${escapeHTML(
                                status
                            )}

                        </span>

                    </div>


                    <div class="applicant-profile">

                        <p>

                            <strong>
                                📍 Location:
                            </strong>

                            ${escapeHTML(
                                location
                            )}

                        </p>


                        <p>

                            <strong>
                                🛠️ Skills:
                            </strong>

                            ${escapeHTML(
                                skills
                            )}

                        </p>

                    </div>


                    <div class="applicant-message">

                        <strong>
                            Application Message
                        </strong>

                        <p>

                            ${escapeHTML(
                                application.cover_message ||
                                "No message provided."
                            )}

                        </p>

                    </div>


                    <p class="application-date">

                        Applied:

                        ${new Date(
                            application.created_at
                        ).toLocaleDateString()}

                    </p>


                    <div class="applicant-actions">

                        <button
                            class="accept-applicant"
                            data-application-id="${application.id}"
                        >
                            Accept
                        </button>


                        <button
                            class="reject-applicant"
                            data-application-id="${application.id}"
                        >
                            Reject
                        </button>

                    </div>

                `;


                applicantsContainer.appendChild(
                    card
                );

            }
        );


        // ================================
        // ACCEPT BUTTONS
        // ================================

        document
            .querySelectorAll(
                ".accept-applicant"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            updateApplicationStatus(
                                button.dataset.applicationId,
                                "accepted"
                            );

                        }
                    );

                }
            );


        // ================================
        // REJECT BUTTONS
        // ================================

        document
            .querySelectorAll(
                ".reject-applicant"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            updateApplicationStatus(
                                button.dataset.applicationId,
                                "rejected"
                            );

                        }
                    );

                }
            );

    }


    catch (error) {

        console.error(
            "Applicants error:",
            error
        );

        applicantsContainer.innerHTML = `
            <p>
                Something went wrong while loading applicants.
            </p>
        `;

    }

}

// ========================================
// UPDATE APPLICATION STATUS
// ========================================

async function updateApplicationStatus(
    applicationId,
    newStatus
) {

    const confirmed =
        confirm(
            `Are you sure you want to mark this application as ${newStatus}?`
        );


    if (!confirmed) {
        return;
    }


    try {

        // ========================================
        // UPDATE APPLICATION
        // ========================================

        const {
            data: application,
            error: applicationError
        } =
            await supabaseClient
                .from("applications")
                .update({
                    status: newStatus
                })
                .eq(
                    "id",
                    applicationId
                )
                .select("job_id")
                .single();


        if (applicationError) {

            console.error(
                "Application update error:",
                applicationError
            );

            alert(
                "Could not update the application."
            );

            return;
        }


        // ========================================
        // IF ACCEPTED, UPDATE THE JOB
        // ========================================

        if (newStatus === "accepted") {

            const {
                error: jobError
            } =
                await supabaseClient
                    .from("jobs")
                    .update({
                        status: "in_progress"
                    })
                    .eq(
                        "id",
                        application.job_id
                    );


            if (jobError) {

                console.error(
                    "Job status update error:",
                    jobError
                );

                alert(
                    "Applicant was accepted, but the job status could not be updated."
                );

                return;
            }

        }


        // ========================================
        // SUCCESS MESSAGE
        // ========================================

        if (newStatus === "accepted") {

            alert(
                "Applicant accepted! The job is now in progress."
            );

        }

        else {

            alert(
                "Application marked as rejected."
            );

        }


        // ========================================
        // RELOAD APPLICANTS
        // ========================================

        loadApplicants();

    }


    catch (error) {

        console.error(
            "Status update error:",
            error
        );

        alert(
            "Something went wrong. Please try again."
        );

    }


}

// Automatically load applicants when the page opens
    loadApplicants();
    
}
// ========================================
// MARK JOB AS COMPLETED
// ========================================

const jobCompletionContainer =
    document.getElementById(
        "job-completion-container"
    );


if (jobCompletionContainer) {

    async function loadJobCompletion() {

        const params =
            new URLSearchParams(
                window.location.search
            );

        const jobId =
            params.get("id");


        if (!jobId) {
            return;
        }


        try {

            // Get logged-in user
            const {
                data: {
                    user
                }
            } =
                await supabaseClient.auth.getUser();


            if (!user) {
                return;
            }


            // Get job
            const {
                data: job,
                error
            } =
                await supabaseClient
                    .from("jobs")
                    .select(
                        "id, user_id, status"
                    )
                    .eq(
                        "id",
                        jobId
                    )
                    .single();


            if (error || !job) {
                return;
            }


            // Only the job owner can complete it
            if (job.user_id !== user.id) {
                return;
            }


            // ========================================
            // JOB ALREADY COMPLETED
            // ========================================

            if (job.status === "completed") {

                jobCompletionContainer.innerHTML = `

                    <div class="job-completed-message">

                        ✓ This job has been completed.

                    </div>

                `;

                return;
            }


            // ========================================
            // JOB NOT YET IN PROGRESS
            // ========================================

            if (job.status !== "in_progress") {

                return;

            }


            // ========================================
            // SHOW COMPLETE BUTTON
            // ========================================

            jobCompletionContainer.innerHTML = `

                <div class="complete-job-card">

                    <h2>
                        Complete This Job
                    </h2>

                    <p>
                        If the work has been completed successfully,
                        mark this job as completed.
                    </p>

                    <button
                        id="complete-job-button"
                        class="complete-job-button"
                    >
                        Mark Job as Completed
                    </button>

                </div>

            `;


            const completeButton =
                document.getElementById(
                    "complete-job-button"
                );


            completeButton.addEventListener(
                "click",
                async function () {

                    const confirmed =
                        confirm(
                            "Are you sure this job has been completed?"
                        );


                    if (!confirmed) {
                        return;
                    }


                    completeButton.disabled =
                        true;

                    completeButton.textContent =
                        "Completing...";


                    const {
                        error: updateError
                    } =
                        await supabaseClient
                            .from("jobs")
                            .update({
                                status: "completed"
                            })
                            .eq(
                                "id",
                                jobId
                            );


                    if (updateError) {

                        console.error(
                            "Job completion error:",
                            updateError
                        );

                        alert(
                            "Could not complete the job."
                        );

                        completeButton.disabled =
                            false;

                        completeButton.textContent =
                            "Mark Job as Completed";

                        return;
                    }


                    alert(
                        "Job marked as completed!"
                    );


                    loadJobCompletion();

                }
            );

        }

        catch (error) {

            console.error(
                "Job completion error:",
                error
            );

        }

    }


    loadJobCompletion();

}

// ================================
// LOGOUT
// ================================

const logoutButton = document.getElementById("logout-button");

if (logoutButton) {
    logoutButton.addEventListener("click", async function () {
        const confirmLogout = confirm(
            "Are you sure you want to log out?"
        );

        if (!confirmLogout) {
            return;
        }

        const { error } = await supabaseClient.auth.signOut();

        if (error) {
            alert("Logout failed: " + error.message);
            return;
        }

        window.location.href = "login.html";
    });
}

/* ========================================
   EMPLOYER DASHBOARD STATISTICS
======================================== */

const employerTotalJobs =
    document.getElementById("employer-total-jobs");

const employerActiveJobs =
    document.getElementById("employer-active-jobs");

const employerTotalApplications =
    document.getElementById("employer-total-applications");

if (
    employerTotalJobs &&
    employerActiveJobs &&
    employerTotalApplications
) {
    async function loadEmployerStatistics() {
        try {
            const {
                data: { user },
                error: authError
            } = await supabaseClient.auth.getUser();

            if (authError || !user) {
                window.location.href = "login.html";
                return;
            }

            // Get jobs posted by this employer
            const {
                data: jobs,
                error: jobsError
            } = await supabaseClient
                .from("jobs")
                .select("id, status")
                .eq("user_id", user.id);

            if (jobsError) {
                throw jobsError;
            }

            const employerJobs = jobs || [];

            const activeJobs = employerJobs.filter(
                job =>
                    String(job.status || "").toLowerCase() === "active"
            ).length;

            employerTotalJobs.textContent =
                employerJobs.length;

            employerActiveJobs.textContent =
                activeJobs;

            // Count applications for the employer's jobs
            const jobIds = employerJobs.map(job => job.id);

            if (jobIds.length === 0) {
                employerTotalApplications.textContent = "0";
                return;
            }

            const {
                count,
                error: applicationsError
            } = await supabaseClient
                .from("applications")
                .select("id", {
                    count: "exact",
                    head: true
                })
                .in("job_id", jobIds);

            if (applicationsError) {
                throw applicationsError;
            }

            employerTotalApplications.textContent =
                count ?? 0;

        } catch (error) {
            console.error(
                "Employer statistics error:",
                error
            );
        }
    }

    loadEmployerStatistics();
}

 // ========================================
 // NAIJAJOBS - LOAD AND SAVE PROFILE
 // ========================================

const profileForm = document.getElementById("profile-form");

if (profileForm) {

    const profileMessage =
        document.getElementById("profile-message");

    async function loadProfile() {

        if (profileMessage) {
            profileMessage.textContent = "Loading your profile...";
        }

        try {

            const {
                data: { user },
                error: authError
            } = await supabaseClient.auth.getUser();

            if (authError || !user) {
                window.location.href = "login.html";
                return;
            }

            const {
                data: profile,
                error
            } = await supabaseClient
                .from("profiles")
                .select(`
                    id,
                    full_name,
                    email,
                    account_type,
                    location,
                    skills,
                    bio
                `)
                .eq("id", user.id)
                .maybeSingle();

            if (error) {
                console.error("Load profile error:", error);
                profileMessage.textContent =
                    "Could not load your profile. Please try again.";
                return;
            }

            if (!profile) {
                profileMessage.textContent =
                    "Your profile record was not found. Please contact support.";
                return;
            }

            document.getElementById("full-name").value =
                profile.full_name || "";

            document.getElementById("profile-email").value =
                profile.email || user.email || "";

            document.getElementById("account-type").value =
                profile.account_type || "";

            document.getElementById("location").value =
                profile.location || "";

            document.getElementById("skills").value =
                Array.isArray(profile.skills)
                    ? profile.skills.join(", ")
                    : profile.skills || "";

            document.getElementById("bio").value =
                profile.bio || "";

            const displayName =
                document.getElementById("profile-display-name");

            const avatarLetter =
                document.getElementById("profile-avatar-letter");

            if (displayName) {
                displayName.textContent =
                    profile.full_name || "My Profile";
            }

            if (avatarLetter) {
                avatarLetter.textContent =
                    (profile.full_name || "N").charAt(0).toUpperCase();
            }

            profileMessage.textContent = "";

        } catch (error) {

            console.error("Unexpected load profile error:", error);

            if (profileMessage) {
                profileMessage.textContent =
                    "Something went wrong while loading your profile.";
            }
        }
    }


    profileForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        if (profileMessage) {
            profileMessage.textContent = "Saving your profile...";
        }

        try {

            const {
                data: { user },
                error: authError
            } = await supabaseClient.auth.getUser();

            if (authError || !user) {
                if (profileMessage) {
                    profileMessage.textContent =
                        "Please log in again to save your profile.";
                }

                return;
            }

            const fullName =
                document.getElementById("full-name").value.trim();

            const accountType =
                document.getElementById("account-type").value;

            const location =
                document.getElementById("location").value.trim();

            const skills =
                document.getElementById("skills").value.trim();

            const bio =
                document.getElementById("bio").value.trim();

            if (!fullName || !accountType) {
                profileMessage.textContent =
                    "Please enter your full name and select your account type.";
                return;
            }

            const {
                data: savedProfile,
                error
            } = await supabaseClient
                .from("profiles")
                .update({
                    full_name: fullName,
                    account_type: accountType,
                    location: location || null,
                    skills: skills || null,
                    bio: bio || null
                })
                .eq("id", user.id)
                .select("id, full_name, location, skills, bio, account_type")
                .maybeSingle();

            if (error) {
                console.error("Save profile error:", error);

                profileMessage.textContent =
                    "Could not save your profile. Check your Supabase permissions.";
                return;
            }

            if (!savedProfile) {
                profileMessage.textContent =
                    "Your profile was not updated. Check that your profile exists and you have permission to update it.";
                return;
            }

            const displayName =
                document.getElementById("profile-display-name");

            const avatarLetter =
                document.getElementById("profile-avatar-letter");

            if (displayName) {
                displayName.textContent = fullName;
            }

            if (avatarLetter) {
                avatarLetter.textContent =
                    fullName.charAt(0).toUpperCase();
            }

            profileMessage.textContent =
                "Profile saved successfully!";

        } catch (error) {

            console.error("Unexpected save profile error:", error);

            if (profileMessage) {
                profileMessage.textContent =
                    "Something went wrong. Please try again.";
            }
        }

    });

    loadProfile();

}
/* =========================================
NAIJAJOBS - LOAD MESSAGES INBOX
========================================= */

async function loadMessagesInbox() {
const container = document.getElementById("messages-container");

if (!container) return;

container.innerHTML = `
    <div class="messages-empty-state nj-messages-empty-state">
        <h3>Loading conversations...</h3>
        <p>Please wait while we load your inbox.</p>
    </div>
`;

try {
    const {
        data: { user },
        error: authError
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
        window.location.href = "login.html";
        return;
    }

    const { data: conversations, error } = await supabaseClient
        .from("conversations")
        .select(`
            id,
            participant_one,
            participant_two,
            updated_at
        `)
        .or(
            `participant_one.eq.${user.id},participant_two.eq.${user.id}`
        )
        .order("updated_at", { ascending: false });

    if (error) throw error;

    if (!conversations || conversations.length === 0) {
        container.innerHTML = `
            <div class="messages-empty-state nj-messages-empty-state">
                <div class="nj-messages-empty-icon">
                    <span>💬</span>
                </div>
                <h3>No conversations yet</h3>
                <p>
                    When you start messaging an employer or job seeker,
                    your conversations will appear here.
                </p>
                <a href="browse.html"
                   class="messages-browse-button nj-messages-browse-button">
                    Explore Jobs <span>→</span>
                </a>
            </div>
        `;
        return;
    }

    const otherUserIds = [
        ...new Set(
            conversations.map(conversation =>
                conversation.participant_one === user.id
                    ? conversation.participant_two
                    : conversation.participant_one
            )
        )
    ];

    const { data: profiles, error: profilesError } = await supabaseClient
        .from("profiles")
        .select("id, full_name, account_type")
        .in("id", otherUserIds);

    if (profilesError) throw profilesError;

    const profileMap = new Map(
        (profiles || []).map(profile => [profile.id, profile])
    );

    const conversationIds = conversations.map(item => item.id);

    const { data: messages, error: messagesError } = await supabaseClient
        .from("messages")
        .select("conversation_id, content, sender_id, created_at")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false });

    if (messagesError) throw messagesError;

    const latestMessageMap = new Map();

    (messages || []).forEach(message => {
        if (!latestMessageMap.has(message.conversation_id)) {
            latestMessageMap.set(message.conversation_id, message);
        }
    });

    container.innerHTML = conversations.map(conversation => {
        const otherUserId =
            conversation.participant_one === user.id
                ? conversation.participant_two
                : conversation.participant_one;

        const profile = profileMap.get(otherUserId);
        const name = profile?.full_name || "NaijaJobs user";
        const initial = name.charAt(0).toUpperCase();
        const latestMessage = latestMessageMap.get(conversation.id);

        const preview = latestMessage
            ? `${latestMessage.sender_id === user.id ? "You: " : ""}${latestMessage.content}`
            : "Start your conversation";

        const date = latestMessage?.created_at || conversation.updated_at;
        const time = date
            ? new Date(date).toLocaleDateString()
            : "";

        return `
            <a
                href="message.html?conversation=${encodeURIComponent(conversation.id)}"
                class="nj-conversation-card"
            >
                <div class="nj-conversation-avatar">
                    ${escapeHTML(initial)}
                </div>

                <div class="nj-conversation-info">
                    <h3>${escapeHTML(name)}</h3>
                    <p>${escapeHTML(preview)}</p>
                </div>

                <span class="nj-conversation-time">
                    ${escapeHTML(time)}
                </span>
            </a>
        `;
    }).join("");

} catch (error) {
    console.error("Error loading messages inbox:", error);

    container.innerHTML = `
        <div class="messages-empty-state nj-messages-empty-state">
            <h3>Couldn't load your inbox</h3>
            <p>Please refresh the page and try again.</p>
        </div>
    `;
}

}

loadMessagesInbox();
/* =========================================
NAIJAJOBS - CHAT FUNCTIONALITY
========================================= */

async function initializeNaijaJobsChat() {
const chatMessages = document.getElementById("chat-messages");
const chatForm = document.getElementById("chat-form");

// Only run on message.html
if (!chatMessages || !chatForm) return;

const chatInput = document.getElementById("chat-input");
const sendButton = document.getElementById("chat-send");
const chatName = document.getElementById("chat-name");
const chatAvatar = document.getElementById("chat-avatar");
const chatNotice = document.getElementById("chat-notice");

const params = new URLSearchParams(window.location.search);
const conversationId = params.get("conversation");

let currentUser;
let otherUserId;
let refreshInterval;
let sending = false;

function showNotice(message, isError = false) {
    chatNotice.textContent = message;
    chatNotice.classList.toggle("nj-chat-error", isError);
}

function renderMessages(messages) {
    chatMessages.replaceChildren();

    if (!messages || messages.length === 0) {
        const empty = document.createElement("div");
        empty.className = "nj-chat-notice";
        empty.textContent = "No messages yet. Send the first message!";
        chatMessages.appendChild(empty);
        return;
    }

    messages.forEach(message => {
        const bubble = document.createElement("div");

        bubble.className =
            "nj-chat-bubble " +
            (message.sender_id === currentUser.id
                ? "nj-chat-mine"
                : "nj-chat-theirs");

        const text = document.createElement("p");
        text.textContent = message.content;

        const time = document.createElement("time");
        time.dateTime = message.created_at;
        time.textContent = new Date(
            message.created_at
        ).toLocaleString();

        bubble.append(text, time);
        chatMessages.appendChild(bubble);
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function loadChatMessages() {
    const { data, error } = await supabaseClient
        .from("messages")
        .select("id, sender_id, content, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

    if (error) throw error;

    renderMessages(data);
}

try {
    if (!conversationId) {
        chatMessages.textContent =
            "No conversation selected. Return to your inbox and open a conversation.";
        chatForm.hidden = true;
        return;
    }

    const {
        data: { user },
        error: authError
    } = await supabaseClient.auth.getUser();

    if (authError) throw authError;

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    currentUser = user;

    const { data: conversation, error: conversationError } =
        await supabaseClient
            .from("conversations")
            .select("id, participant_one, participant_two")
            .eq("id", conversationId)
            .maybeSingle();

    if (conversationError) throw conversationError;

    if (!conversation) {
        chatMessages.textContent =
            "Conversation not found or access denied.";
        chatForm.hidden = true;
        return;
    }

    if (
        conversation.participant_one !== user.id &&
        conversation.participant_two !== user.id
    ) {
        chatMessages.textContent =
            "You don't have permission to access this conversation.";
        chatForm.hidden = true;
        return;
    }

    otherUserId =
        conversation.participant_one === user.id
            ? conversation.participant_two
            : conversation.participant_one;

    const { data: profile, error: profileError } =
        await supabaseClient
            .from("profiles")
            .select("full_name")
            .eq("id", otherUserId)
            .maybeSingle();

    if (profileError) throw profileError;

    const name = profile?.full_name || "NaijaJobs user";
    chatName.textContent = name;
    chatAvatar.textContent = name.charAt(0).toUpperCase();

    await loadChatMessages();

    // Refresh to check for new messages
    refreshInterval = setInterval(async () => {
        try {
            await loadChatMessages();
        } catch (error) {
            console.error("Unable to refresh messages:", error);
        }
    }, 5000);

    chatForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        if (sending) return;

        const content = chatInput.value.trim();

        if (!content) {
            showNotice("Please type a message first.", true);
            return;
        }

        sending = true;
        sendButton.disabled = true;
        showNotice("");

        try {
            const { error: insertError } = await supabaseClient
                .from("messages")
                .insert({
                    conversation_id: conversationId,
                    sender_id: currentUser.id,
                    content: content
                });

            if (insertError) throw insertError;

            chatInput.value = "";
            await loadChatMessages();

            const { error: updateError } = await supabaseClient
                .from("conversations")
                .update({
                    updated_at: new Date().toISOString()
                })
                .eq("id", conversationId);

            if (updateError) {
                console.warn("Conversation timestamp update failed:", updateError);
            }
        } catch (error) {
            console.error("Failed to send message:", error);
            showNotice(
                error.message || "Message could not be sent. Please try again.",
                true
            );
        } finally {
            sending = false;
            sendButton.disabled = false;
        }
    });

} catch (error) {
    console.error("Chat initialization failed:", error);

    chatMessages.textContent =
        "Couldn't load this conversation. Please refresh and try again.";

    showNotice(
        error.message || "An unexpected error occurred.",
        true
    );
}

}

initializeNaijaJobsChat();


/* =========================================
   NAIJAJOBS - ADMIN DASHBOARD
========================================= */

async function checkAdminAccess() {
    const adminPage = document.getElementById("admin-dashboard");

    // Do nothing on pages other than the admin dashboard.
    if (!adminPage) return;

    const message = document.getElementById("admin-message");
    const logoutButton = document.getElementById("admin-logout");

    try {
        const {
            data: { user },
            error: authError
        } = await supabaseClient.auth.getUser();

        if (authError || !user) {
            window.location.replace("login.html");
            return;
        }

        // Verify this user is listed as an administrator.
        const { data: admin, error: adminError } = await supabaseClient
            .from("admin_users")
            .select("user_id")
            .eq("user_id", user.id)
            .maybeSingle();

        if (adminError) {
            console.error("Admin verification failed:", adminError);
            message.textContent =
                "Unable to verify admin access. Please try again.";
            return;
        }

        if (!admin) {
            alert("Access denied. Administrators only.");
            window.location.replace("index.html");
            return;
        }

        // Show dashboard after verification succeeds.
        adminPage.hidden = false;
        message.textContent = "Administrator access verified.";

        // Load user count.
        const { count: userCount, error: userError } =
            await supabaseClient
                .from("profiles")
                .select("id", {
                    count: "exact",
                    head: true
                });

        document.getElementById("admin-user-count").textContent =
            userError ? "Unavailable" : userCount;

        // Load job count.
        const { count: jobCount, error: jobError } =
            await supabaseClient
                .from("jobs")
                .select("id", {
                    count: "exact",
                    head: true
                });

        document.getElementById("admin-job-count").textContent =
            jobError ? "Unavailable" : jobCount;

        if (userError || jobError) {
            console.warn(
                "Some dashboard counts could not load.",
                { userError, jobError }
            );
        }

        // Log out the administrator.
        if (logoutButton) {
            logoutButton.addEventListener("click", async () => {
                logoutButton.disabled = true;

                const { error } = await supabaseClient.auth.signOut();

                if (error) {
                    console.error("Admin logout failed:", error);
                    message.textContent = "Logout failed. Please try again.";
                    logoutButton.disabled = false;
                    return;
                }

                window.location.replace("login.html");
            });
        }

    } catch (error) {
        console.error("Admin dashboard error:", error);
        message.textContent =
            "Something went wrong while loading the admin dashboard.";
    }
}

checkAdminAccess();

/* =========================================
   NAIJAJOBS - ADMIN USER MANAGEMENT
========================================= */


async function loadAdminUsers() {
    const tableBody = document.getElementById("admin-users-list");

    if (!tableBody) return;

    const message = document.getElementById("users-message");

    tableBody.replaceChildren();
    message.textContent = "Loading users...";

    try {
        const {
            data: { user },
            error: authError
        } = await supabaseClient.auth.getUser();

        if (authError || !user) {
            window.location.replace("login.html");
            return;
        }

        const { data, error } = await supabaseClient.rpc(
            "admin_list_profiles"
        );

        if (error) throw error;
        console.log("Admin profiles returned:", data);
        console.table(data);

        if (!data || data.length === 0) {
            message.textContent = "No registered profiles found.";
            return;
        }

        data.forEach(function (profile) {
            const row = document.createElement("tr");

            const values = [
                profile.full_name || "Name not provided",
                profile.account_type || "Not specified",
                profile.location || "Not provided",
                profile.skills || "Not provided",
                profile.is_suspended ? "Suspended" : "Active"
            ];

            values.forEach(function (value) {
                const cell = document.createElement("td");
                cell.style.padding = "12px";
                cell.style.borderBottom = "1px solid #eee";
                cell.textContent = value;
                row.appendChild(cell);
            });

            const actionCell = document.createElement("td");
            actionCell.style.padding = "12px";
            actionCell.style.borderBottom = "1px solid #eee";

            const actionButton = document.createElement("button");
            actionButton.type = "button";
            actionButton.className = "admin-button";
            actionButton.textContent = profile.is_suspended
                ? "Restore User"
                : "Suspend User";

            actionButton.addEventListener("click", async function () {
                const newSuspensionStatus = !profile.is_suspended;

                const confirmed = window.confirm(
                    newSuspensionStatus
                        ? "Are you sure you want to suspend this user?"
                        : "Are you sure you want to restore this user?"
                );

                if (!confirmed) return;

                actionButton.disabled = true;
                message.textContent = newSuspensionStatus
                    ? "Suspending user..."
                    : "Restoring user...";

                try {
                    const { error: updateError } =
                        await supabaseClient.rpc(
                            "admin_set_user_suspension",
                            {
                                p_user_id: profile.id,
                                p_is_suspended: newSuspensionStatus
                            }
                        );

                    if (updateError) throw updateError;

                    // Record the successful change in the activity log.
                    const { error: logError } =
                        await supabaseClient.rpc(
                            "admin_record_activity",
                            {
                                p_action: newSuspensionStatus
                                    ? "user_suspended"
                                    : "user_restored",
                                p_target_type: "user",
                                p_target_id: String(profile.id),
                                p_details: {
                                    full_name: profile.full_name ||
                                        "Name not provided"
                                }
                            }
                        );

                    if (logError) {
                        console.error(
                            "Activity log failed:",
                            logError
                        );
                    }

                    await loadAdminUsers();
                    await loadAdminActivity();

                } catch (error) {
                    console.error(
                        "Unable to change user status:",
                        error
                    );

                    message.textContent =
                        "Could not change user status: " +
                        error.message;

                    actionButton.disabled = false;
                }
            });

            actionCell.appendChild(actionButton);
            row.appendChild(actionCell);
            tableBody.appendChild(row);
        });

        message.textContent =
            "Showing " + data.length + " registered profiles.";

    } catch (error) {
        console.error("Unable to load admin users:", error);
        message.textContent =
            "Could not load users. Check the browser console.";
    }
}

const refreshAdminUsersButton =
    document.getElementById("refresh-users");

if (refreshAdminUsersButton) {
    refreshAdminUsersButton.addEventListener(
        "click",
        loadAdminUsers
    );
}

loadAdminUsers();
// ========================================
// NAIJAJOBS - ADMIN JOB MANAGEMENT
// ========================================

async function loadAdminJobs() {
const tableBody = document.getElementById("admin-jobs-list");

if (!tableBody) return;

const message = document.getElementById("jobs-message");

tableBody.replaceChildren();
message.textContent = "Loading job listings...";

try {
    const {
        data: { user },
        error: authError
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
        window.location.replace("login.html");
        return;
    }

    const { data: jobs, error } = await supabaseClient
        .from("jobs")
        .select(
            "id, title, description, category, budget, location, job_type, deadline, status, created_at"
        )
        .order("created_at", { ascending: false });

    if (error) throw error;

    if (!jobs || jobs.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 4;
        cell.style.padding = "12px";
        cell.textContent = "No job listings found.";

        row.appendChild(cell);
        tableBody.appendChild(row);

        message.textContent = "No jobs to display.";
        return;
    }

    jobs.forEach(function (job) {
        const row = document.createElement("tr");

        [
            job.title || "Untitled job",
            job.category || "Not specified",
            job.location || "Not specified"
        ].forEach(function (value) {
            const cell = document.createElement("td");
            cell.style.padding = "12px";
            cell.style.borderBottom = "1px solid #eee";
            cell.textContent = value;
            row.appendChild(cell);
        });

        const actionCell = document.createElement("td");
        actionCell.style.padding = "12px";
        actionCell.style.borderBottom = "1px solid #eee";

        // VIEW DETAILS BUTTON
        const viewButton = document.createElement("button");
        viewButton.type = "button";
        viewButton.className = "admin-button";
        viewButton.textContent = "View Details";

        viewButton.addEventListener("click", function () {
            const existingDetails = document.getElementById(
                "job-details-" + job.id
            );

            if (existingDetails) {
                existingDetails.remove();
                viewButton.textContent = "View Details";
                return;
            }

            const detailsRow = document.createElement("tr");
            detailsRow.id = "job-details-" + job.id;

            const detailsCell = document.createElement("td");
            detailsCell.colSpan = 4;
            detailsCell.style.padding = "16px";
            detailsCell.style.background = "#f7f8fc";

            const heading = document.createElement("h3");
            heading.textContent = job.title || "Untitled job";
            detailsCell.appendChild(heading);

            const details = [
                ["Description", job.description],
                ["Category", job.category],
                ["Budget", job.budget],
                ["Location", job.location],
                ["Job Type", job.job_type],
                ["Deadline", job.deadline],
                ["Status", job.status],
                ["Date Posted", job.created_at]
            ];

            details.forEach(function (item) {
                const paragraph = document.createElement("p");
                const label = document.createElement("strong");

                label.textContent = item[0] + ": ";
                paragraph.appendChild(label);

                let value = item[1];

                if (
                    item[0] === "Deadline" ||
                    item[0] === "Date Posted"
                ) {
                    value = value
                        ? new Date(value).toLocaleString()
                        : "Not specified";
                } else if (
                    item[0] === "Budget" &&
                    value !== null &&
                    value !== undefined &&
                    value !== ""
                ) {
                    value = "₦" + Number(value).toLocaleString();
                } else {
                    value = value || "Not specified";
                }

                paragraph.appendChild(
                    document.createTextNode(String(value))
                );

                detailsCell.appendChild(paragraph);
            });

            detailsRow.appendChild(detailsCell);
            row.insertAdjacentElement("afterend", detailsRow);
            viewButton.textContent = "Hide Details";
        });

        actionCell.appendChild(viewButton);

        // CHANGE STATUS DROPDOWN
        const statusSelect = document.createElement("select");
        statusSelect.style.display = "block";
        statusSelect.style.marginTop = "8px";
        statusSelect.style.padding = "8px";
        statusSelect.style.maxWidth = "180px";

        const statuses = [
            { value: "open", label: "Open" },
            { value: "in_progress", label: "In Progress" },
            { value: "completed", label: "Completed" },
            { value: "closed", label: "Closed" },
            { value: "cancelled", label: "Cancelled" }
        ];

        statuses.forEach(function (status) {
            const option = document.createElement("option");
            option.value = status.value;
            option.textContent = status.label;
            statusSelect.appendChild(option);
        });

        const currentStatus = statuses.some(
            status => status.value === job.status
        ) ? job.status : "open";

        statusSelect.value = currentStatus;

        const saveStatusButton = document.createElement("button");
        saveStatusButton.type = "button";
        saveStatusButton.className = "admin-button";
        saveStatusButton.textContent = "Save Status";
        saveStatusButton.style.marginTop = "8px";

        saveStatusButton.addEventListener("click", async function () {
            const newStatus = statusSelect.value;

            if (newStatus === job.status) {
                message.textContent = "The job already has that status.";
                return;
            }

            saveStatusButton.disabled = true;
            message.textContent = "Updating job status...";

            try {
                const { error } = await supabaseClient.rpc(
                    "admin_update_job_status",
                    {
                        p_job_id: job.id,
                        p_status: newStatus
                    }
                );

                if (error) throw error;
await supabaseClient.rpc("admin_record_activity", {
p_action: "job_status_updated",
p_target_type: "job",
p_target_id: String(job.id),
p_details: {
title: job.title,
previous_status: job.status,
new_status: newStatus
}
});

                message.textContent = "Job status updated successfully.";
                await loadAdminJobs();

            } catch (error) {
                console.error("Status update failed:", error);
                message.textContent =
                    "Could not update status: " + error.message;
                saveStatusButton.disabled = false;
            }
        });

        actionCell.appendChild(statusSelect);
        actionCell.appendChild(saveStatusButton);

        // DELETE JOB BUTTON
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "admin-button";
        deleteButton.textContent = "Delete Job";
        deleteButton.style.display = "block";
        deleteButton.style.marginTop = "8px";

        deleteButton.addEventListener("click", async function () {
            const confirmed = window.confirm(
                "Are you sure you want to permanently delete this job?\n\n" +
                (job.title || "Untitled job") +
                "\n\nThis action cannot be undone."
            );

            if (!confirmed) return;

            deleteButton.disabled = true;
            message.textContent = "Deleting job...";

            try {
                const { error } = await supabaseClient.rpc(
                    "admin_delete_job",
                    {
                        p_job_id: job.id
                    }
                );

                if (error) throw error;
await supabaseClient.rpc("admin_record_activity", {
p_action: "job_deleted",
p_target_type: "job",
p_target_id: String(job.id),
p_details: {
title: job.title,
previous_status: job.status
}
});

                message.textContent = "Job deleted successfully.";
                await loadAdminJobs();

            } catch (error) {
                console.error("Job deletion failed:", error);
                message.textContent =
                    "Could not delete job: " + error.message;
                deleteButton.disabled = false;
            }
        });

        actionCell.appendChild(deleteButton);
        row.appendChild(actionCell);
        tableBody.appendChild(row);
    });

    message.textContent =
        "Showing " + jobs.length + " job listing(s).";

} catch (error) {
    console.error("Unable to load admin jobs:", error);
    message.textContent =
        "Could not load jobs. Check the browser console for details.";
}

}


// Refresh job listings
const refreshAdminJobsButton =
document.getElementById("refresh-jobs");

if (refreshAdminJobsButton) {
refreshAdminJobsButton.addEventListener(
"click",
loadAdminJobs
);
}

// Load jobs when the admin dashboard opens
loadAdminJobs();
// ========================================
// NAIJAJOBS - ADMIN ACTIVITY LOG
// ========================================

async function loadAdminActivity() {
const tableBody = document.getElementById("admin-activity-list");

if (!tableBody) return;

const message = document.getElementById("activity-message");

tableBody.replaceChildren();
message.textContent = "Loading activity...";

try {
    const {
        data: { user },
        error: authError
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
        window.location.replace("login.html");
        return;
    }

    const { data: logs, error } = await supabaseClient
        .from("admin_activity_logs")
        .select("id, admin_user_id, action, target_type, target_id, details, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

    if (error) throw error;

    if (!logs || logs.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 4;
        cell.style.padding = "12px";
        cell.textContent = "No activity recorded yet.";

        row.appendChild(cell);
        tableBody.appendChild(row);

        message.textContent = "No activity recorded yet.";
        return;
    }

    logs.forEach(function (log) {
        const row = document.createElement("tr");

        const dateCell = document.createElement("td");
        dateCell.style.padding = "12px";
        dateCell.style.borderBottom = "1px solid #eee";
        dateCell.textContent = new Date(
            log.created_at
        ).toLocaleString();
        row.appendChild(dateCell);

        const actionCell = document.createElement("td");
        actionCell.style.padding = "12px";
        actionCell.style.borderBottom = "1px solid #eee";
        actionCell.textContent = log.action;
        row.appendChild(actionCell);

        const targetCell = document.createElement("td");
        targetCell.style.padding = "12px";
        targetCell.style.borderBottom = "1px solid #eee";
        targetCell.textContent =
            log.target_type +
            (log.target_id ? " (" + log.target_id + ")" : "");
        row.appendChild(targetCell);

        const detailsCell = document.createElement("td");
        detailsCell.style.padding = "12px";
        detailsCell.style.borderBottom = "1px solid #eee";

        const details = document.createElement("pre");
        details.style.whiteSpace = "pre-wrap";
        details.style.margin = "0";
        details.textContent = JSON.stringify(
            log.details || {},
            null,
            2
        );

        detailsCell.appendChild(details);
        row.appendChild(detailsCell);

        tableBody.appendChild(row);
    });

    message.textContent =
        "Showing " + logs.length + " recent activity record(s).";

} catch (error) {
    console.error("Unable to load admin activity:", error);

    message.textContent =
        "Could not load activity. Check the browser console.";
}

}

const refreshActivityButton =
document.getElementById("refresh-activity");

if (refreshActivityButton) {
refreshActivityButton.addEventListener(
"click",
loadAdminActivity
);
}

loadAdminActivity();

